
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe } from "lucide-react";

interface LanguageSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
}

const LanguageSelector = ({ value, onValueChange }: LanguageSelectorProps) => {
  const languages = [
    { code: 'english', name: 'English', nativeName: 'English' },
    { code: 'bemba', name: 'Bemba', nativeName: 'Ichibemba' },
    { code: 'nyanja', name: 'Nyanja', nativeName: 'Chinyanja' }
  ];

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-full">
        <div className="flex items-center">
          <Globe className="h-4 w-4 mr-2" />
          <SelectValue placeholder="Select language" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {languages.map((lang) => (
          <SelectItem key={lang.code} value={lang.code}>
            {lang.name} ({lang.nativeName})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default LanguageSelector;
