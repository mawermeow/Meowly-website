import { mkdir, readFile, writeFile } from "node:fs/promises";

const locales = [
  { language: "zh-Hant", label: "繁中", folder: "" },
  { language: "en", label: "English", folder: "en/" },
  { language: "ja", label: "日本語", folder: "ja/" },
  { language: "ko", label: "한국어", folder: "ko/" },
];
const policyDate = "2026-11-20";
const pages = { "index.html": "home", "privacy.html": "privacy" };
const webRoot = new URL("./", import.meta.url);
const source = new URL("source/", webRoot);

const escapeHtml = (value) => value.replace(/[&<>"']/g, (character) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]
);

function render(template, values) {
  return template.replace(/\{\{\{(\w+)\}\}\}|\{\{(\w+)\}\}/g, (_, markupKey, textKey) => {
    const key = markupKey ?? textKey;
    if (typeof values[key] !== "string") throw new Error(`Missing translation: ${key}`);
    return markupKey ? values[key] : escapeHtml(values[key]);
  });
}

const [layout, home, privacy] = await Promise.all(
  ["layout", "home", "privacy"].map((name) => readFile(new URL(`${name}.html`, source), "utf8"))
);

const toneFiles = {
  purrAudio: "meowly-morning-purr.mp3",
  whiskerAudio: "gentle-whisker.mp3",
  pounceAudio: "energetic-pounce.mp3",
};
const toneSources = Object.fromEntries(await Promise.all(
  Object.entries(toneFiles).map(async ([key, file]) => {
    // Keep previews playable after the static page has loaded, including file:// previews.
    const audio = await readFile(new URL(`assets/${file}`, webRoot));
    return [key, `data:audio/mpeg;base64,${audio.toString("base64")}`];
  })
));

for (const locale of locales) {
  const { language, folder } = locale;
  const copy = JSON.parse(await readFile(new URL(`locales/${language}.json`, source), "utf8"));
  const base = folder ? "../" : "";
  const output = new URL(folder, webRoot);
  await mkdir(output, { recursive: true });

  for (const [file, page] of Object.entries(pages)) {
    const isHome = page === "home";
    const content = render(isHome ? home : privacy, {
      ...copy,
      ...toneSources,
      base,
      policyDate,
      formattedDate: new Intl.DateTimeFormat(language, {
        dateStyle: "long",
        timeZone: "UTC",
      }).format(new Date(policyDate)),
    });
    const languageLinks = locales.map((option) => render(
      '<a href="{{href}}" lang="{{language}}" hreflang="{{language}}"{{{current}}}>{{label}}</a>',
      {
        ...option,
        href: option === locale ? file : `${base}${option.folder}${file}`,
        current: option === locale ? ' aria-current="page"' : "",
      },
    )).join("\n        ");

    const result = render(layout, {
      ...copy,
      language,
      base,
      content,
      languageLinks,
      title: isHome ? copy.homeTitle : `${copy.privacy} | Meowly`,
      description: isHome ? copy.homeDescription : copy.privacyDescription,
      sectionBase: isHome ? "" : "index.html",
      homeUrl: isHome ? "#top" : "index.html",
      brandLabel: isHome ? copy.brandTop : copy.brandHome,
      privacyCurrent: isHome ? "" : ' aria-current="page"',
      iphoneLink: isHome ? render('      <a class="button button-outline header-link" href="#iphone">{{iphoneLink}}</a>', copy) : "",
      script: isHome ? render('  <script src="{{base}}tones.js" defer></script>', { base }) : "",
    });

    await writeFile(new URL(file, output), result);
  }
}
