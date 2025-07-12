import { useEffect, useState } from "preact/hooks";
import { type Settings, useSettingsStore } from "@/stores/settings";
import {
  getSettingsByCategory,
  isSettingEnabled,
  SETTING_CATEGORIES,
  type SettingConfig,
  type SettingValue,
} from "@/stores/settingsConfig";
import "@/styles/animebytes.css";
import { log } from "@/utils/logging";

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

const ChevronIcon = ({ expanded }: { expanded: boolean }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={`ab-settings-chevron ${expanded ? "expanded" : ""}`}
  >
    <path d="m9 18 6-6-6-6" />
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
    <div className={`ab-settings-option ${disabled ? "disabled" : ""}`}>
      <div className="ab-settings-option-content">
        <div className="ab-settings-option-header">
          <strong>{config.label}</strong>
          {config.helpUrl && (
            <a
              href={config.helpUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ab-settings-help-link"
              aria-label={`Get help for ${config.label}`}
            >
              <ExternalLinkIcon />
            </a>
          )}
        </div>
        <div className="ab-settings-option-description">{config.description}</div>
        {config.type === "string" && (
          <input
            type="text"
            placeholder={config.placeholder}
            value={(value as string) || ""}
            onChange={handleStringChange}
            className="ab-settings-input"
            disabled={disabled}
          />
        )}
      </div>
      {config.type === "boolean" && (
        <button
          className={`ab-settings-toggle ${value ? "active" : ""}`}
          onClick={handleToggle}
          aria-label={`Toggle ${config.label} ${value ? "off" : "on"}`}
          type="button"
          disabled={disabled}
        />
      )}
    </div>
  );
}

interface CategorySectionProps {
  category: (typeof SETTING_CATEGORIES)[0];
  settings: SettingConfig[];
  settingsValues: Settings;
  onChange: (key: string, value: SettingValue) => void;
}

function CategorySection({ category, settings, settingsValues, onChange }: CategorySectionProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="ab-settings-category">
      <button
        className="ab-settings-category-header"
        onClick={() => setExpanded(!expanded)}
        type="button"
        aria-expanded={expanded}
        aria-controls={`category-${category.id}`}
      >
        <div className="ab-settings-category-info">
          <h4>{category.label}</h4>
          {category.description && <p>{category.description}</p>}
        </div>
        <ChevronIcon expanded={expanded} />
      </button>
      <div id={`category-${category.id}`} className={`ab-settings-category-content ${expanded ? "expanded" : ""}`}>
        {settings.map((setting) => (
          <SettingItem
            key={setting.key}
            config={setting}
            value={settingsValues[setting.key]}
            onChange={onChange}
            disabled={!isSettingEnabled(settingsValues, setting)}
          />
        ))}
      </div>
    </div>
  );
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const settingsStore = useSettingsStore();
  const [isClosing, setIsClosing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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

  if (!isOpen && !isClosing) {
    return null;
  }

  return (
    <div
      className={`ab-settings-modal ${isClosing ? "ab-fade-out" : "ab-fade-in"}`}
      onClick={handleBackdropClick}
      onKeyDown={handleBackdropKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ab-settings-title"
      tabIndex={-1}
    >
      <div className="ab-settings-content">
        <div className="ab-settings-header">
          <h3 id="ab-settings-title">AnimeBytes Suite Settings</h3>
          <button className="ab-settings-close" onClick={handleClose} aria-label="Close settings" type="button">
            <CloseIcon />
          </button>
        </div>

        <div className="ab-settings-search">
          <input
            type="text"
            placeholder="Search settings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
            className="ab-settings-search-input"
            aria-label="Search settings"
          />
        </div>

        <div className="ab-settings-body">
          {filteredCategories.map(({ category, settings }) => (
            <CategorySection
              key={category.id}
              category={category}
              settings={settings}
              settingsValues={settingsValues}
              onChange={handleSettingChange}
            />
          ))}
        </div>

        <div className="ab-settings-footer">
          <p>Some changes may require refreshing the page to take effect.</p>
          <button className="ab-settings-reset" onClick={() => settingsStore.resetToDefaults()} type="button">
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
      <li>
        <button
          className="ab-settings-btn"
          onClick={() => setIsModalOpen(true)}
          type="button"
          aria-label="Open AnimeBytes Suite settings"
        >
          AB Suite
        </button>
      </li>
      <SettingsModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
