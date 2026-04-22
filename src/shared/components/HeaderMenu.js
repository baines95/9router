"use client";

import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { LOCALE_COOKIE, normalizeLocale } from "@/i18n/config";
import { useTheme } from "@/shared/hooks/useTheme";
import ChangelogModal from "./ChangelogModal";
import NineRemotePromoModal from "./NineRemotePromoModal";
import LanguageSwitcher from "./LanguageSwitcher";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { 
  LayoutGrid, 
  History, 
  Languages, 
  Sun, 
  Moon, 
  Monitor, 
  LogOut 
} from "lucide-react";

const LOCALE_INFO = {
  "en": { name: "English", flag: "🇺🇸" },
  "vi": { name: "Tiếng Việt", flag: "🇻🇳" },
  "zh-CN": { name: "简体中文", flag: "🇨🇳" },
  "zh-TW": { name: "繁體中文", flag: "🇹🇼" },
  "ja": { name: "日本語", flag: "🇯🇵" },
  "pt-BR": { name: "Português (BR)", flag: "🇧🇷" },
  "pt-PT": { name: "Português (PT)", flag: "🇵🇹" },
  "ko": { name: "한국어", flag: "🇰🇷" },
  "es": { name: "Español", flag: "🇪🇸" },
  "de": { name: "Deutsch", flag: "🇩🇪" },
  "fr": { name: "Français", flag: "🇫🇷" },
  "he": { name: "עברית", flag: "🇮🇱" },
  "ar": { name: "العربية", flag: "🇸🇦" },
  "ru": { name: "Русский", flag: "🇷🇺" },
  "pl": { name: "Polski", flag: "🇵🇱" },
  "cs": { name: "Čeština", flag: "🇨🇿" },
  "nl": { name: "Nederlands", flag: "🇳🇱" },
  "tr": { name: "Türkçe", flag: "🇹🇷" },
  "uk": { name: "Українська", flag: "🇺🇦" },
  "tl": { name: "Tagalog", flag: "🇵🇭" },
  "id": { name: "Indonesia", flag: "🇮🇩" },
  "th": { name: "ไทย", flag: "🇹🇭" },
  "hi": { name: "हिन्दी", flag: "🇮🇳" },
  "bn": { name: "বাংলা", flag: "🇧🇩" },
  "ur": { name: "اردو", flag: "🇵🇰" },
  "ro": { name: "Română", flag: "🇷🇴" },
  "sv": { name: "Svenska", flag: "🇸🇪" },
  "it": { name: "Italiano", flag: "🇮🇹" },
  "el": { name: "Ελληνικά", flag: "🇬🇷" },
  "hu": { name: "Magyar", flag: "🇭🇺" },
  "fi": { name: "Suomi", flag: "🇫🇮" },
  "da": { name: "Dansk", flag: "🇩🇰" },
  "no": { name: "Norsk", flag: "🇳🇴" },
};

function getLocaleFromCookie() {
  if (typeof document === "undefined") return "en";
  const cookie = document.cookie
    .split(";")
    .find((c) => c.trim().startsWith(`${LOCALE_COOKIE}=`));
  const value = cookie ? decodeURIComponent(cookie.split("=")[1]) : "en";
  return normalizeLocale(value);
}

export default function HeaderMenu({ onLogout }) {
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [remoteOpen, setRemoteOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [locale, setLocale] = useState("en");
  const { toggleTheme, isDark } = useTheme();

  useEffect(() => {
    setLocale(getLocaleFromCookie());
  }, [langOpen]);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <LayoutGrid className="size-5" />
            <span className="sr-only">Menu</span>
          </Button>
        } />
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => setChangelogOpen(true)}>
            <History className="mr-2 size-4" />
            <span>Change Log</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setLangOpen(true)}>
            <Languages className="mr-2 size-4" />
            <span className="flex-1">Language</span>
            <span className="text-xs text-muted-foreground">{LOCALE_INFO[locale]?.flag}</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => toggleTheme()}>
            {isDark ? <Sun className="mr-2 size-4" /> : <Moon className="mr-2 size-4" />}
            <span>Theme</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setRemoteOpen(true)}>
            <Monitor className="mr-2 size-4" />
            <span>Remote</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onLogout} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
            <LogOut className="mr-2 size-4" />
            <span>Logout</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ChangelogModal isOpen={changelogOpen} onClose={() => setChangelogOpen(false)} />
      <NineRemotePromoModal isOpen={remoteOpen} onClose={() => setRemoteOpen(false)} />
      <LanguageSwitcher hideTrigger isOpen={langOpen} onClose={() => setLangOpen(false)} />
    </>
  );
}

HeaderMenu.propTypes = {
  onLogout: PropTypes.func.isRequired,
};
