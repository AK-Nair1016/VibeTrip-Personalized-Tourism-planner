import { getPasswordChecks } from "./authRules";

interface PasswordRulesProps {
  password: string;
}

interface RuleRowProps {
  passed: boolean;
  text: string;
}

function RuleRow({ passed, text }: RuleRowProps) {
  const colorClass = passed ? "text-primary-container" : "text-on-surface-variant";
  const iconName = passed ? "check_circle" : "radio_button_unchecked";

  return (
    <li className={`flex items-center gap-2 font-label-md text-label-md font-normal ${colorClass}`}>
      <span className="material-symbols-outlined text-[16px]">{iconName}</span>
      <span>{text}</span>
    </li>
  );
}

// The live checklist under the password box. Same three rules as the backend.
export default function PasswordRules({ password }: PasswordRulesProps) {
  const checks = getPasswordChecks(password);

  return (
    <ul className="space-y-1.5 px-1">
      <RuleRow passed={checks.longEnough} text="At least 8 characters" />
      <RuleRow passed={checks.hasUppercase} text="An uppercase letter" />
      <RuleRow passed={checks.hasNumber} text="A number" />
    </ul>
  );
}
