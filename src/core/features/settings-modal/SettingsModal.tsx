import { useEffect, useState } from "preact/hooks";
import { type Settings, useSettingsStore } from "@/lib/state/settings";
import {
  getSettingsByCategory,
  isSettingEnabled,
  SETTING_CATEGORIES,
  type SettingConfig,
  type SettingValue,
} from "@/lib/state/settingsConfig";
import { log } from "@/lib/utils/logging";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CloseIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

const ExternalLinkIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

interface SettingItemProps {
  config: SettingConfig;
  value: SettingValue;
  onChange: (key: string, value: SettingValue) => void;
  disabled?: boolean;
}

function SettingItem({ config, value, onChange, disabled }: SettingItemProps) {
  const handleToggle = () => {
    if (config.type === "boolean" && !disabled) {
      onChange(config.key, !value);
      if (config.requiresReload) {
        log("Setting updated. Some changes may require a page reload.");
      }
    }
  };

  const handleStringChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    onChange(config.key, target.value);
  };

  return (
    <div
      p="16px"
      border="1 solid [hsl(0,0%,25%)]"
      rounded="6px"
      bg="[hsl(0,0%,18%)]"
      flex
      justify="between"
      items="start"
      gap="16px"
      transition="border-color"
      hover={disabled ? "border-[hsl(0,0%,25%)]" : "border-[hsl(0,0%,35%)]"}
      op={disabled ? "50" : "100"}
    >
      <div flex="1">
        <div flex items="center" gap="8px" mb="4px">
          <strong text="white" text-size="14px">
            {config.label}
          </strong>
          {config.helpUrl && (
            <a
              href={config.helpUrl}
              target="_blank"
              rel="noopener noreferrer"
              text-color="[hsl(213,85%,60%)]"
              un-decoration="none"
              inline-flex
              items="center"
              transition="color"
              hover="text-[hsl(213,85%,70%)]"
              aria-label={`Get help for ${config.label}`}
            >
              <ExternalLinkIcon />
            </a>
          )}
        </div>
        <div text-color="[hsl(0,0%,67%)]" text-size="12px" line-height="[1.4]">
          {config.description}
        </div>
        {config.type === "string" && (
          <input
            type="text"
            placeholder={config.placeholder}
            value={(value as string) || ""}
            onChange={handleStringChange}
            size-w="full"
            p="[8px_12px]"
            mt="8px"
            bg="[hsl(0,0%,10%)]"
            border="1 solid [hsl(0,0%,30%)]"
            rounded="4px"
            text="white"
            text-size="0.9em"
            box="border"
            focus="outline-none border-[hsl(336,87%,50%)] shadow-[0_0_0_2px_hsla(336,87%,50%,0.2)]"
            disabled={disabled}
          />
        )}
      </div>
      {config.type === "boolean" && (
        <button
          position="relative"
          size-w-50px
          size-h-24px
          bg={value ? "[hsl(336,87%,50%)]" : "[hsl(0,0%,80%)]"}
          rounded="12px"
          cursor="pointer"
          transition="background 300"
          border="none"
          onClick={handleToggle}
          aria-label={`Toggle ${config.label} ${value ? "off" : "on"}`}
          type="button"
          disabled={disabled}
        >
          <div
            size-20px
            position="absolute top-2px left-2px"
            transform={value ? "translate-x-26px" : "translate-x-0"}
            bg="white"
            rounded="50%"
            transition="transform 300"
          />
        </button>
      )}
    </div>
  );
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const settingsStore = useSettingsStore();
  const [isClosing, setIsClosing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState(SETTING_CATEGORIES[0]?.id || "navigation");

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 150);
  };

  const handleBackdropClick = (e: Event) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleBackdropKeyDown = (e: KeyboardEvent) => {
    if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleSettingChange = (key: string, value: SettingValue) => {
    if (typeof value === "string") {
      settingsStore.updateStringSetting(
        key as keyof Pick<Settings, "simklClientId" | "tmdbApiToken" | "youtubeApiKey">,
        value,
      );
    } else if (typeof value === "boolean") {
      settingsStore.toggleSetting(key as keyof Omit<Settings, "simklClientId" | "tmdbApiToken" | "youtubeApiKey">);
    }
  };

  // Get all settings values
  const settingsValues = settingsStore.getAllSettings();

  // Filter settings based on search
  const filteredCategories = SETTING_CATEGORIES.map((category) => {
    const categorySettings = getSettingsByCategory(category.id);
    const filteredSettings = searchQuery
      ? categorySettings.filter(
          (setting) =>
            setting.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
            setting.description.toLowerCase().includes(searchQuery.toLowerCase()),
        )
      : categorySettings;
    return { category, settings: filteredSettings };
  }).filter((item) => item.settings.length > 0);

  // Get current category settings for the main panel
  const activeCategoryData = filteredCategories.find((item) => item.category.id === activeCategory);

  if (!isOpen && !isClosing) {
    return null;
  }

  return (
    <div
      fixed
      position="fixed top-0 left-0 z-10000"
      size-w="full"
      size-h="full"
      bg="[rgba(0,0,0,0.8)]"
      flex
      items="center"
      justify="center"
      cursor="default"
      animate="[ab-fade-in-out]"
      onClick={handleBackdropClick}
      onKeyDown={handleBackdropKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ab-settings-title"
      tabIndex={-1}
    >
      <div
        bg="[hsl(0,0%,16%)]"
        p="0"
        rounded="8px"
        size-w="full"
        min-w="800px"
        max-w="1200px"
        size-h-800px
        grid
        areas="header_header/search_search/sidebar_main/footer_footer"
        grid-cols="[280px_1fr]"
        grid-rows="[auto_auto_1fr_auto]"
      >
        <div grid-area="[header]" flex justify="between" items="center" p="20px" border-b="1 solid [hsl(0,0%,20%)]">
          <h3 id="ab-settings-title" m="0" text="white">
            animebytes Suite Settings
          </h3>
          <button
            bg="[none]"
            border="none"
            text-size="20px"
            cursor="pointer"
            text-color="[hsl(0,0%,67%)]"
            hover="text-white"
            onClick={handleClose}
            aria-label="Close settings"
            type="button"
          >
            <CloseIcon />
          </button>
        </div>

        <div grid-area="[search]" p="[15px_20px]" border-b="1 solid [hsl(0,0%,20%)]">
          <input
            type="text"
            placeholder="Search settings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
            size-w="full"
            p="[8px_12px]"
            bg="[hsl(0,0%,10%)]"
            border="1 solid [hsl(0,0%,25%)]"
            rounded="4px"
            text="white"
            text-size="14px"
            box="border"
            focus="outline-none border-[hsl(213,85%,60%)]"
            aria-label="Search settings"
          />
        </div>

        <div min-h="0" grid="~ row-3 col-span-full" grid-areas="[sidebar_main]" grid-cols="[280px_1fr]">
          <nav
            grid-area="[sidebar]"
            bg="[hsl(0,0%,14%)]"
            border-r="1 solid [hsl(0,0%,20%)]"
            p="[16px_0]"
            overflow-y="auto"
            flex="~ col"
            gap="2px"
            aria-label="Settings categories"
          >
            {filteredCategories.map(({ category, settings }) => (
              <button
                key={category.id}
                bg={activeCategory === category.id ? "[hsl(213,85%,15%)]" : "[none]"}
                border={activeCategory === category.id ? "none r-3px r-solid r-[hsl(213,85%,60%)]" : "none"}
                p="[12px_20px]"
                text="left"
                cursor="pointer"
                transition="background"
                flex
                items="center"
                gap="12px"
                text-color={activeCategory === category.id ? "white" : "[hsl(0,0%,70%)]"}
                size-w="full"
                hover={
                  activeCategory === category.id ? "bg-[hsl(213,85%,18%)] text-white" : "bg-[hsl(0,0%,18%)] text-white"
                }
                onClick={() => setActiveCategory(category.id)}
                type="button"
                aria-label={`View ${category.label} settings`}
              >
                <span text-size="18px" flex="shrink-0" size-w-24px text-align="center">
                  {category.icon}
                </span>
                <div flex="1" min-w="0">
                  <div text-size="14px" font="600" mb="2px" line-height="[1.2]">
                    {category.label}
                  </div>
                  <div
                    text-size="11px"
                    text-color={activeCategory === category.id ? "[hsl(213,85%,70%)]" : "[hsl(0,0%,50%)]"}
                    line-height="[1]"
                  >
                    {settings.length} setting{settings.length !== 1 ? "s" : ""}
                  </div>
                </div>
              </button>
            ))}
          </nav>

          <div grid-area="[main]" p="20px" overflow-y="auto" bg="[hsl(0,0%,16%)]">
            {activeCategoryData && (
              <>
                <div mb="24px" pb="16px" border-b="1 solid [hsl(0,0%,25%)]">
                  <h4 m="[0_0_8px_0]" text="white" text-size="20px" font="600" flex items="center" gap="8px">
                    {activeCategoryData.category.icon} {activeCategoryData.category.label}
                  </h4>
                  {activeCategoryData.category.description && (
                    <p m="0" text-color="[hsl(0,0%,67%)]" text-size="14px" line-height="[1.4]">
                      {activeCategoryData.category.description}
                    </p>
                  )}
                </div>
                <div flex="~ col" gap="16px">
                  {activeCategoryData.settings.map((setting) => (
                    <SettingItem
                      key={setting.key}
                      config={setting}
                      value={settingsValues[setting.key]}
                      onChange={handleSettingChange}
                      disabled={!isSettingEnabled(settingsValues, setting)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div
          grid-area="[footer]"
          flex
          justify="between"
          items="center"
          p="[15px_20px]"
          border-t="1 solid [hsl(0,0%,20%)]"
          bg="[hsl(0,0%,14%)]"
        >
          <p m="0" text-color="[hsl(0,0%,60%)]" text-size="12px">
            Some changes may require refreshing the page to take effect.
          </p>
          <button
            p="[6px_12px]"
            bg="[hsl(0,91%,40%)]"
            border="none"
            rounded="4px"
            text="white"
            cursor="pointer"
            text-size="12px"
            transition="background"
            hover="bg-[hsl(0,91%,50%)]"
            onClick={() => settingsStore.resetToDefaults()}
            type="button"
          >
            Reset to Defaults
          </button>
        </div>
      </div>
    </div>
  );
}

export function SettingsButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        bg="[none]"
        border="none"
        text="white"
        position="relative top-0 right-0 z-9999"
        cursor="pointer"
        align="middle"
        hover="text-[hsl(0,0%,88%)]"
        onClick={() => setIsModalOpen(true)}
        type="button"
        aria-label="Open animebytes Suite settings"
      >
        AB Suite
      </button>
      <SettingsModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
