import { SquaredIconButton } from "@packages/ui/components/squared-icon-button";
import { LanguagesIcon } from "lucide-react";
import * as React from "react";
import {
   getCurrentLanguage,
   changeLanguage,
   getAvailableLanguages,
   getLanguageDisplayName,
} from "@packages/localization";

export const LanguageSwitcher = () => {
   const [currentLang, setCurrentLang] = React.useState(getCurrentLanguage());

   const availableLanguages = getAvailableLanguages();

   const nextLanguage = React.useMemo(() => {
      const currentIndex = availableLanguages.indexOf(currentLang);
      const nextIndex = (currentIndex + 1) % availableLanguages.length;
      return availableLanguages[nextIndex];
   }, [currentLang, availableLanguages]);

   const handleLanguageSwitch = async () => {
      if (nextLanguage) {
         try {
            await changeLanguage(nextLanguage);
            setCurrentLang(nextLanguage);
            window.location.reload();
         } catch (error) {
            console.error("Failed to change language:", error);
         }
      }
   };

   return (
      <SquaredIconButton onClick={handleLanguageSwitch}>
         <LanguagesIcon />
         {getLanguageDisplayName(currentLang)} →{" "}
         {nextLanguage ? getLanguageDisplayName(nextLanguage) : ""}
      </SquaredIconButton>
   );
};
