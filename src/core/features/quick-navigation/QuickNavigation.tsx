import { useEffect, useState } from "preact/hooks";
import { log } from "@/lib/utils/logging";
import { useSettingsStore } from "@/lib/state/settings";

interface CategoryData {
  name: string;
  url: string;
  groups: GroupData[];
}

interface GroupData {
  name: string;
  html: string;
}

async function fetchDocument(url: string): Promise<Document> {
  try {
    const response = await fetch(url);
    const html = await response.text();
    const parser = new DOMParser();
    return parser.parseFromString(html, "text/html");
  } catch (error) {
    log("Error fetching document:", error);
    throw error;
  }
}

function getNextPageUrl(doc: Document): string | null {
  const nextPageLinks = Array.from(doc.querySelectorAll("a.next-prev:not(.last):not(.first)"));
  const nextLink = nextPageLinks[nextPageLinks.length - 1] as HTMLAnchorElement;

  if (nextLink?.textContent?.includes("→")) {
    return nextLink.href;
  }

  return null;
}

function extractDataFromDocument(doc: Document): CategoryData[] {
  const categories: CategoryData[] = [];
  const torrentTables = doc.querySelectorAll(".torrent_table");

  torrentTables.forEach((table) => {
    const categoryLink = table.querySelector("strong > a") as HTMLAnchorElement;
    if (!categoryLink) return;

    const categoryName = categoryLink.textContent?.trim() || "";
    const categoryUrl = categoryLink.href;

    const groups: GroupData[] = [];
    const groupElements = table.querySelectorAll(".group");

    groupElements.forEach((group) => {
      const groupHeader = group.querySelector("h3");
      if (groupHeader) {
        groups.push({
          name: groupHeader.textContent?.trim() || "",
          html: groupHeader.innerHTML,
        });
      }
    });

    categories.push({
      name: categoryName,
      url: categoryUrl,
      groups,
    });
  });

  return categories;
}

function mergeCategories(existingCategories: CategoryData[], newCategories: CategoryData[]): CategoryData[] {
  const categoryMap = new Map<string, CategoryData>();

  existingCategories.forEach((cat) => {
    categoryMap.set(cat.name, { ...cat });
  });

  newCategories.forEach((newCat) => {
    const existing = categoryMap.get(newCat.name);
    if (existing) {
      existing.groups.push(...newCat.groups);
    } else {
      categoryMap.set(newCat.name, { ...newCat });
    }
  });

  return Array.from(categoryMap.values());
}

function createQuickNavBox(): HTMLElement | null {
  const sidebar = document.querySelector(".sidebar");
  if (!sidebar) return null;

  const box = document.createElement("div");
  box.className = "box quick_nav";

  const head = document.createElement("div");
  head.className = "head";

  const title = document.createElement("strong");
  title.textContent = "Quick Navigation";
  head.appendChild(title);

  const ulCategories = document.createElement("ul");
  box.appendChild(head);
  box.appendChild(ulCategories);

  const firstChild = sidebar.querySelector("div:nth-child(1)");
  const hasUserInfo = firstChild?.querySelector("p");

  if (hasUserInfo && firstChild) {
    firstChild.insertAdjacentElement("afterend", box);
  } else {
    sidebar.prepend(box);
  }

  return ulCategories;
}

function renderCategories(container: HTMLElement, categories: CategoryData[]) {
  container.innerHTML = "";

  categories.forEach((category) => {
    const liCategory = document.createElement("li");
    liCategory.setAttribute("name", category.name);

    const categoryTitle = document.createElement("a");
    categoryTitle.textContent = category.name;
    categoryTitle.href = category.url;
    categoryTitle.className = "category_title";

    const ulGroups = document.createElement("ul");

    category.groups.forEach((group) => {
      const liGroup = document.createElement("li");
      liGroup.innerHTML = group.html;
      ulGroups.appendChild(liGroup);
    });

    liCategory.appendChild(categoryTitle);
    liCategory.appendChild(ulGroups);
    container.appendChild(liCategory);
  });
}

export function QuickNavigation() {
  const settingsStore = useSettingsStore(["quickNavigationEnabled"]);
  const [_isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!settingsStore.quickNavigationEnabled) return;

    async function initializeQuickNav() {
      const currentUrl = window.location.href;
      const isSeriesPage = /series\.php/.test(currentUrl);
      const isArtistPage = /artist\.php/.test(currentUrl);

      if (!isSeriesPage && !isArtistPage) return;

      try {
        setIsLoading(true);
        const container = createQuickNavBox();
        if (!container) return;

        const hasPageNums = document.querySelector(".pagenums");

        if (!hasPageNums) {
          const categories = extractDataFromDocument(document);
          renderCategories(container, categories);
        } else {
          const url = new URL(currentUrl);
          const params = new URLSearchParams(url.search);

          if (params.has("page")) {
            params.set("page", "1");
          } else {
            params.append("page", "1");
          }

          url.search = params.toString();
          let nextPageUrl: string | null = url.toString();
          let allCategories: CategoryData[] = [];

          while (nextPageUrl) {
            const doc = await fetchDocument(nextPageUrl);
            const pageCategories = extractDataFromDocument(doc);
            allCategories = mergeCategories(allCategories, pageCategories);
            nextPageUrl = getNextPageUrl(doc);
          }

          renderCategories(container, allCategories);
        }
      } catch (error) {
        log("Error initializing Quick Navigation:", error);
      } finally {
        setIsLoading(false);
      }
    }

    initializeQuickNav();
  }, [settingsStore.quickNavigationEnabled]);

  return null;
}
