
export const LOCALES = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "tr", label: "Türkçe" },
  { code: "de", label: "Deutsch" },
  { code: "fr", label: "Français" },
] as const;

export type LocaleCode = (typeof LOCALES)[number]["code"];

export const DEFAULT_LOCALE: LocaleCode = "en";

type Catalog = Record<string, string>;

const en: Catalog = {
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.create": "Create",
  "common.delete": "Delete",
  "common.search": "Search",
  "nav.home": "Home",
  "nav.inbox": "Inbox",
  "nav.assistant": "Assistant",
  "nav.projects": "Projects",
  "nav.settings": "Settings",
  "settings.appearance.theme": "Theme",
  "settings.appearance.language": "Language",
  "settings.appearance.languageHint": "Choose the language for the Elliptic interface.",
  "home.getStarted": "Get started",
};

const es: Catalog = {
  "common.save": "Guardar",
  "common.cancel": "Cancelar",
  "common.create": "Crear",
  "common.delete": "Eliminar",
  "common.search": "Buscar",
  "nav.home": "Inicio",
  "nav.inbox": "Bandeja",
  "nav.assistant": "Asistente",
  "nav.projects": "Proyectos",
  "nav.settings": "Ajustes",
  "settings.appearance.theme": "Tema",
  "settings.appearance.language": "Idioma",
  "settings.appearance.languageHint": "Elige el idioma de la interfaz de Elliptic.",
  "home.getStarted": "Empezar",
};

const tr: Catalog = {
  "common.save": "Kaydet",
  "common.cancel": "İptal",
  "common.create": "Oluştur",
  "common.delete": "Sil",
  "common.search": "Ara",
  "nav.home": "Ana sayfa",
  "nav.inbox": "Gelen kutusu",
  "nav.assistant": "Asistan",
  "nav.projects": "Projeler",
  "nav.settings": "Ayarlar",
  "settings.appearance.theme": "Tema",
  "settings.appearance.language": "Dil",
  "settings.appearance.languageHint": "Elliptic arayüzü için dili seçin.",
  "home.getStarted": "Başlayın",
};

const de: Catalog = {
  "common.save": "Speichern",
  "common.cancel": "Abbrechen",
  "common.create": "Erstellen",
  "common.delete": "Löschen",
  "common.search": "Suchen",
  "nav.home": "Start",
  "nav.inbox": "Posteingang",
  "nav.assistant": "Assistent",
  "nav.projects": "Projekte",
  "nav.settings": "Einstellungen",
  "settings.appearance.theme": "Design",
  "settings.appearance.language": "Sprache",
  "settings.appearance.languageHint": "Wählen Sie die Sprache der Elliptic-Oberfläche.",
  "home.getStarted": "Loslegen",
};

const fr: Catalog = {
  "common.save": "Enregistrer",
  "common.cancel": "Annuler",
  "common.create": "Créer",
  "common.delete": "Supprimer",
  "common.search": "Rechercher",
  "nav.home": "Accueil",
  "nav.inbox": "Boîte de réception",
  "nav.assistant": "Assistant",
  "nav.projects": "Projets",
  "nav.settings": "Paramètres",
  "settings.appearance.theme": "Thème",
  "settings.appearance.language": "Langue",
  "settings.appearance.languageHint": "Choisissez la langue de l'interface Elliptic.",
  "home.getStarted": "Commencer",
};

export const CATALOGS: Record<LocaleCode, Catalog> = { en, es, tr, de, fr };

export function isLocale(value: string): value is LocaleCode {
  return value in CATALOGS;
}
