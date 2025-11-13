import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EnrollmentCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  isEnrolled: boolean;
  onEnroll: () => void;
  disabled?: boolean;
}

export const EnrollmentCard = ({
  title,
  description,
  icon: Icon,
  isEnrolled,
  onEnroll,
  disabled = false,
}: EnrollmentCardProps) => {
  return (
    <Card className={cn(
      "transition-all hover:shadow-lg",
      isEnrolled ? "border-green-500/50 bg-green-500/5" : "border-border"
    )}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-3 rounded-lg",
              isEnrolled ? "bg-green-500/20" : "bg-primary/20"
            )}>
              <Icon className={cn(
                "h-6 w-6",
                isEnrolled ? "text-green-500" : "text-primary"
              )} />
            </div>
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
          {isEnrolled ? (
            <CheckCircle2 className="h-6 w-6 text-green-500" />
          ) : (
            <Circle className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Button
          onClick={onEnroll}
          disabled={disabled}
          variant={isEnrolled ? "outline" : "default"}
          className="w-full"
        >
          {isEnrolled ? 'Re-enroll' : 'Enroll Now'}
        </Button>
      </CardContent>
    </Card>
  );
};
