// Real DaVinci Resolve demo projects playable in the static web demo (no upload, real media proxies).
// Each manifest is produced by scripts/build_web_demo_project.py from an original .dra archive.

export const WEB_DEMO_PROJECTS = [
  {
    id: "edit-page-effects",
    name: "Edit Page Effects",
    archive: "Edit Page Effects.dra",
    manifest: "./projects/edit-page-effects/project.json",
    poster: "./projects/edit-page-effects/thumbs/a007-01021818-c004.jpg",
    credit: "Blackmagic Design training project (DaVinci Resolve 17, Visual Effects in the Edit Page)",
    sourceUrl: "https://www.blackmagicdesign.com/fr/products/davinciresolve/training"
  }
];
