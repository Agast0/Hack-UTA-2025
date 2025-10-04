import { SeverityLevel } from '@/types/bug';

const roastMessages = {
  low: [
    "This bug is so minor, it's practically a feature request.",
    "Even a goldfish could spot this one.",
    "This is the kind of bug that makes developers question their life choices.",
    "Congratulations, you found the needle in the haystack... that was already on fire.",
  ],
  medium: [
    "This bug has been hiding in plain sight like a ninja in a library.",
    "Well, well, well... look what the cat dragged in.",
    "This is the digital equivalent of a squeaky door at 3 AM.",
    "Someone's been cutting corners, and it shows.",
  ],
  high: [
    "This bug is so obvious, it's practically waving a red flag.",
    "Houston, we have a problem... and it's not rocket science.",
    "This is the kind of bug that makes QA teams cry tears of joy.",
    "Someone needs to go back to Bug Hunting 101.",
  ],
  critical: [
    "This bug is so critical, it's practically a feature.",
    "Congratulations! You've found the holy grail of security vulnerabilities.",
    "This is the kind of bug that makes hackers send you thank you cards.",
    "Someone's going to have a very interesting day when they see this report.",
  ],
};

export function getRoastMessage(severity: SeverityLevel): string {
  const messages = roastMessages[severity];
  return messages[Math.floor(Math.random() * messages.length)];
}
