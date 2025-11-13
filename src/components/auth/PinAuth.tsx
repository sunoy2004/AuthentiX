import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Lock, Delete, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useAuthMethods } from '@/hooks/useAuthMethods';
import { supabase } from '@/integrations/supabase/client';

interface PinAuthProps {
  isOpen: boolean;
  onComplete: (success: boolean) => void;
  onClose: () => void;
  mode: 'enroll' | 'verify';
}

export const PinAuth: React.FC<PinAuthProps> = ({ isOpen, onComplete, onClose, mode }) => {
  const { user } = useAuth();
  const { updateMethodStatus, logAuthAttempt } = useAuthMethods(user?.id);

  const [pin, setPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const [isProcessing, setIsProcessing] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const maxAttempts = 3;

  const handleNumberPress = useCallback((number: string) => {
    if (step === 'enter' && pin.length < 6) {
      setPin(prev => prev + number);
    } else if (step === 'confirm' && confirmPin.length < 6) {
      setConfirmPin(prev => prev + number);
    }
  }, [pin, confirmPin, step]);

  const handleDelete = useCallback(() => {
    if (step === 'enter') {
      setPin(prev => prev.slice(0, -1));
    } else {
      setConfirmPin(prev => prev.slice(0, -1));
    }
  }, [step]);

  const handleClear = useCallback(() => {
    if (step === 'enter') {
      setPin('');
    } else {
      setConfirmPin('');
    }
  }, [step]);

  const hashPin = async (pin: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const processPinAuth = useCallback(async () => {
    if (!user) return;

    if (mode === 'enroll') {
      if (step === 'enter') {
        if (pin.length < 4) {
          toast.error("Please enter at least 4 digits.");
          return;
        }
        setStep('confirm');
        return;
      }

      if (pin !== confirmPin) {
        toast.error("PINs do not match. Please try again.");
        setConfirmPin('');
        setPin('');
        setStep('enter');
        return;
      }

      setIsProcessing(true);
      
      try {
        const pinHash = await hashPin(pin);
        
        const { error } = await supabase
          .from('pins')
          .upsert({
            user_id: user.id,
            pin_hash: pinHash,
          }, {
            onConflict: 'user_id',
          });

        if (error) throw error;

        await updateMethodStatus('pin', true);
        await logAuthAttempt('pin', true);

        toast.success('PIN enrolled successfully');
        onComplete(true);
      } catch (error) {
        console.error('PIN enrollment error:', error);
        toast.error('Failed to enroll PIN');
        onComplete(false);
      } finally {
        setIsProcessing(false);
      }
    } else {
      // Verify mode
      if (pin.length < 4) {
        toast.error("Please enter at least 4 digits.");
        return;
      }

      setIsProcessing(true);
      
      try {
        const pinHash = await hashPin(pin);
        
        const { data, error } = await supabase
          .from('pins')
          .select('pin_hash')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;

        const success = data?.pin_hash === pinHash;

        await logAuthAttempt('pin', success);

        if (success) {
          toast.success('PIN verified successfully');
          onComplete(true);
        } else {
          const newAttempts = attempts + 1;
          setAttempts(newAttempts);
          
          if (newAttempts >= maxAttempts) {
            toast.error("Too many failed attempts. Please try again later.");
            onClose();
          } else {
            toast.error(`Incorrect PIN. ${maxAttempts - newAttempts} attempts remaining.`);
            setPin('');
          }
          onComplete(false);
        }
      } catch (error) {
        console.error('PIN verification error:', error);
        toast.error('Failed to verify PIN');
        onComplete(false);
      } finally {
        setIsProcessing(false);
      }
    }
  }, [pin, confirmPin, user, mode, step, attempts, updateMethodStatus, logAuthAttempt, onComplete, onClose]);

  const keypadNumbers = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['', '0', '']
  ];

  const currentPin = step === 'enter' ? pin : confirmPin;
  const isEnrollMode = mode === 'enroll';
  const showConfirmStep = isEnrollMode && step === 'confirm';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center flex items-center justify-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            {isEnrollMode ? (showConfirmStep ? 'Confirm PIN' : 'Set PIN') : 'Enter PIN'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="text-center space-y-4">
            <div className="w-24 h-24 mx-auto bg-secondary rounded-full flex items-center justify-center">
              <Lock className="w-12 h-12 text-primary" />
            </div>
            <p className="text-muted-foreground">
              {showConfirmStep ? 'Re-enter your PIN to confirm' : 
               isEnrollMode ? 'Create a secure PIN' : 
               'Enter your secure PIN'}
            </p>
            
            <div className="flex justify-center space-x-3">
              {[...Array(6)].map((_, index) => (
                <div
                  key={index}
                  className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                    index < currentPin.length
                      ? 'bg-primary border-primary shadow-lg'
                      : 'border-muted bg-transparent'
                  }`}
                />
              ))}
            </div>

            {attempts > 0 && mode === 'verify' && (
              <p className="text-destructive text-sm">
                {maxAttempts - attempts} attempts remaining
              </p>
            )}
          </div>

          <div className="space-y-3">
            {keypadNumbers.map((row, rowIndex) => (
              <div key={rowIndex} className="flex justify-center space-x-3">
                {row.map((number, colIndex) => (
                  <Button
                    key={`${rowIndex}-${colIndex}`}
                    variant="outline"
                    size="lg"
                    className={`w-16 h-16 text-xl font-semibold border-2 ${
                      number 
                        ? 'border-primary text-primary hover:bg-primary/20' 
                        : 'invisible'
                    }`}
                    onClick={() => number && handleNumberPress(number)}
                    disabled={!number || isProcessing}
                  >
                    {number}
                  </Button>
                ))}
              </div>
            ))}

            <div className="flex justify-center space-x-3 pt-2">
              <Button
                variant="outline"
                size="lg"
                className="w-16 h-16 border-2"
                onClick={handleClear}
                disabled={currentPin.length === 0 || isProcessing}
              >
                C
              </Button>
              
              <Button
                variant="outline"
                size="lg"
                className="w-16 h-16 border-2"
                onClick={handleDelete}
                disabled={currentPin.length === 0 || isProcessing}
              >
                <Delete className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <Button
            onClick={processPinAuth}
            disabled={currentPin.length < 4 || isProcessing}
            className="w-full h-12"
          >
            {isProcessing ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin"></div>
                {isEnrollMode ? 'Enrolling...' : 'Verifying...'}
              </div>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                {showConfirmStep ? 'Confirm PIN' : isEnrollMode ? 'Continue' : 'Verify PIN'}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
