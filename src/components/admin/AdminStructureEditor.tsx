"use client";

import React from "react";
import {
  DEFAULT_HOME_SECTIONS,
  DEFAULT_SETTINGS,
  HomeSectionConfig,
  SiteStructureSettings,
} from "@/lib/settings-types";

interface AdminStructureEditorProps {
  structure: SiteStructureSettings;
  onChange: (next: SiteStructureSettings) => void;
  onSave: (data?: SiteStructureSettings) => Promise<void>;
  saving: boolean;
}

export function AdminStructureEditor({
  structure,
  onChange,
  onSave,
  saving,
}: AdminStructureEditorProps) {
  const sections = structure.sections?.length ? structure.sections : DEFAULT_HOME_SECTIONS;

  const moveSection = (index: number, direction: -1 | 1) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= sections.length) return;
    const copy = [...sections];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIdx, 0, moved);
    onChange({ ...structure, sections: copy });
  };

  const updateSectionField = (
    index: number,
    patch: Partial<HomeSectionConfig>
  ) => {
    const copy = sections.map((sec, idx) =>
      idx === index ? { ...sec, ...patch } : sec
    );
    onChange({ ...structure, sections: copy });
  };

  const updateNavLink = (
    index: number,
    patch: Partial<SiteStructureSettings["navLinks"][number]>
  ) => {
    const navLinks = (structure.navLinks || []).map((item, idx) =>
      idx === index ? { ...item, ...patch } : item
    );
    onChange({ ...structure, navLinks });
  };

  const handleResetSections = () => {
    onChange({
      ...structure,
      sections: DEFAULT_HOME_SECTIONS.map((s) => ({ ...s })),
    });
  };

  const isPricingVisible =
    (structure.navLinks || []).find((l) => l.id === "pricing" || l.href.includes("pricing"))
      ?.visible !== false;

  const togglePricingVisibility = () => {
    const links = structure.navLinks || DEFAULT_SETTINGS.structure.navLinks;
    const nextLinks = links.some((l) => l.id === "pricing" || l.href.includes("pricing"))
      ? links.map((l) =>
          l.id === "pricing" || l.href.includes("pricing")
            ? { ...l, visible: !isPricingVisible }
            : l
        )
      : [
          ...links,
          { id: "pricing", label: "Pricing", href: "/pricing", visible: !isPricingVisible },
        ];
    onChange({ ...structure, navLinks: nextLinks });
  };

  return (
    <div className="space-y-8">
      {/* Sticky Header Action Bar */}
      <div className="rounded-[28px] bg-surface p-6 sm:p-8 shadow-[0_0_0_1px_var(--line)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-lime-soft px-3 py-1 font-mono text-[0.68rem] font-semibold uppercase tracking-wider text-pill-ink">
            Layout & Copy Engine
          </span>
          <h2 className="mt-2 text-2xl font-display font-bold text-ink">
            Site Structure, Navigation & <em className="italic text-moss font-serif">Section Ordering</em>
          </h2>
          <p className="text-xs sm:text-sm text-ink-soft mt-1">
            Reorder homepage sections up/down, hide/show blocks, and edit hero, nav, banner, and footer copy live.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onSave(structure)}
          disabled={saving}
          className="px-6 py-3 rounded-full bg-moss text-on-moss hover:bg-moss-dark font-semibold text-sm shadow-sm transition-all hover:-translate-y-px disabled:opacity-50 shrink-0 cursor-pointer"
        >
          {saving ? "Publishing Structure..." : "Save & Publish Structure"}
        </button>
      </div>

      {/* 1. Reorderable & Editable Homepage Sections */}
      <div className="rounded-[28px] bg-surface p-6 sm:p-8 shadow-[0_0_0_1px_var(--line)] space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-display font-bold text-ink">
              Homepage Sections Order & Content
            </h3>
            <p className="text-xs text-ink-soft">
              Use the ↑ / ↓ controls to rearrange sections on the landing page, or toggle visibility cleanly.
            </p>
          </div>
          <button
            type="button"
            onClick={handleResetSections}
            className="px-3.5 py-1.5 rounded-full border border-line text-xs font-semibold text-ink-soft hover:text-ink hover:bg-muted transition-colors cursor-pointer"
          >
            Reset Default Order
          </button>
        </div>

        <div className="space-y-3">
          {sections.map((sec, idx) => (
            <div
              key={sec.id}
              className={`rounded-2xl p-4 sm:p-5 transition-all shadow-[0_0_0_1px_var(--line)] ${
                sec.visible
                  ? "bg-paper"
                  : "bg-paper/45 opacity-70"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-line/70">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-lime-soft text-pill-ink font-mono text-xs font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <div>
                    <div className="font-semibold text-sm text-ink flex items-center gap-2">
                      <span>{sec.label}</span>
                      <span className="text-[0.65rem] font-mono px-2 py-0.5 rounded-full bg-surface border border-line text-ink-soft">
                        #{sec.id}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => moveSection(idx, -1)}
                    className="px-2.5 py-1.5 rounded-lg bg-surface text-ink text-xs font-semibold shadow-[inset_0_0_0_1px_var(--line)] hover:bg-muted disabled:opacity-35 cursor-pointer"
                    title="Move Section Up"
                  >
                    ↑ Up
                  </button>
                  <button
                    type="button"
                    disabled={idx === sections.length - 1}
                    onClick={() => moveSection(idx, 1)}
                    className="px-2.5 py-1.5 rounded-lg bg-surface text-ink text-xs font-semibold shadow-[inset_0_0_0_1px_var(--line)] hover:bg-muted disabled:opacity-35 cursor-pointer"
                    title="Move Section Down"
                  >
                    ↓ Down
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSectionField(idx, { visible: !sec.visible })}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                      sec.visible
                        ? "bg-lime-soft text-moss"
                        : "bg-surface text-ink-soft shadow-[inset_0_0_0_1px_var(--line)]"
                    }`}
                  >
                    {sec.visible ? "● Visible" : "○ Hidden"}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3">
                <div>
                  <label className="block text-[0.65rem] font-mono font-bold uppercase text-ink-soft mb-1">
                    Badge Text
                  </label>
                  <input
                    type="text"
                    value={sec.badge}
                    onChange={(e) => updateSectionField(idx, { badge: e.target.value })}
                    className="w-full h-9 rounded-lg bg-surface px-3 text-xs text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[0.65rem] font-mono font-bold uppercase text-ink-soft mb-1">
                    Section Title
                  </label>
                  <input
                    type="text"
                    value={sec.title}
                    onChange={(e) => updateSectionField(idx, { title: e.target.value })}
                    className="w-full h-9 rounded-lg bg-surface px-3 text-xs text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[0.65rem] font-mono font-bold uppercase text-ink-soft mb-1">
                    Italic Accent Phrase
                  </label>
                  <input
                    type="text"
                    value={sec.titleHighlight}
                    onChange={(e) => updateSectionField(idx, { titleHighlight: e.target.value })}
                    className="w-full h-9 rounded-lg bg-surface px-3 text-xs text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[0.65rem] font-mono font-bold uppercase text-ink-soft mb-1">
                    Subtitle / Note
                  </label>
                  <input
                    type="text"
                    value={sec.subtitle}
                    onChange={(e) => updateSectionField(idx, { subtitle: e.target.value })}
                    placeholder="Optional section subtext..."
                    className="w-full h-9 rounded-lg bg-surface px-3 text-xs text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Hero Text & Announcement Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-[28px] bg-surface p-6 sm:p-8 shadow-[0_0_0_1px_var(--line)] space-y-4">
          <h3 className="text-lg font-display font-bold text-ink">Hero Headlines & Action Buttons</h3>
          <div>
            <label className="block text-[0.68rem] font-mono font-bold uppercase text-ink-soft mb-1">
              Main Hero Headline (Before Italic Highlight)
            </label>
            <input
              type="text"
              value={structure.heroHeadline}
              onChange={(e) => onChange({ ...structure, heroHeadline: e.target.value })}
              className="w-full h-10 rounded-xl bg-paper px-3.5 text-sm text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none"
            />
          </div>
          <div>
            <label className="block text-[0.68rem] font-mono font-bold uppercase text-ink-soft mb-1">
              Hero Italic Accent Text
            </label>
            <input
              type="text"
              value={structure.heroHeadlineHighlight}
              onChange={(e) => onChange({ ...structure, heroHeadlineHighlight: e.target.value })}
              className="w-full h-10 rounded-xl bg-paper px-3.5 text-sm text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[0.68rem] font-mono font-bold uppercase text-ink-soft mb-1">
                Primary CTA Label
              </label>
              <input
                type="text"
                value={structure.heroPrimaryCtaLabel}
                onChange={(e) => onChange({ ...structure, heroPrimaryCtaLabel: e.target.value })}
                className="w-full h-10 rounded-xl bg-paper px-3 text-sm text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none"
              />
            </div>
            <div>
              <label className="block text-[0.68rem] font-mono font-bold uppercase text-ink-soft mb-1">
                Secondary CTA Label
              </label>
              <input
                type="text"
                value={structure.heroSecondaryCtaLabel}
                onChange={(e) => onChange({ ...structure, heroSecondaryCtaLabel: e.target.value })}
                className="w-full h-10 rounded-xl bg-paper px-3 text-sm text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none"
              />
            </div>
          </div>
        </div>

        <div className="rounded-[28px] bg-surface p-6 sm:p-8 shadow-[0_0_0_1px_var(--line)] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-display font-bold text-ink">Global Announcement Bar</h3>
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...structure,
                  announcementBanner: {
                    ...structure.announcementBanner,
                    visible: !structure.announcementBanner.visible,
                  },
                })
              }
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold cursor-pointer ${
                structure.announcementBanner.visible
                  ? "bg-moss text-on-moss"
                  : "bg-paper text-ink-soft shadow-[inset_0_0_0_1px_var(--line)]"
              }`}
            >
              {structure.announcementBanner.visible ? "Banner ON" : "Banner OFF"}
            </button>
          </div>
          <div>
            <label className="block text-[0.68rem] font-mono font-bold uppercase text-ink-soft mb-1">
              Announcement Text
            </label>
            <input
              type="text"
              value={structure.announcementBanner.text}
              onChange={(e) =>
                onChange({
                  ...structure,
                  announcementBanner: { ...structure.announcementBanner, text: e.target.value },
                })
              }
              className="w-full h-10 rounded-xl bg-paper px-3.5 text-sm text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[0.68rem] font-mono font-bold uppercase text-ink-soft mb-1">
                Banner Link Text
              </label>
              <input
                type="text"
                value={structure.announcementBanner.linkLabel}
                onChange={(e) =>
                  onChange({
                    ...structure,
                    announcementBanner: {
                      ...structure.announcementBanner,
                      linkLabel: e.target.value,
                    },
                  })
                }
                className="w-full h-10 rounded-xl bg-paper px-3 text-sm text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none"
              />
            </div>
            <div>
              <label className="block text-[0.68rem] font-mono font-bold uppercase text-ink-soft mb-1">
                Banner Destination Route
              </label>
              <input
                type="text"
                value={structure.announcementBanner.linkHref}
                onChange={(e) =>
                  onChange({
                    ...structure,
                    announcementBanner: {
                      ...structure.announcementBanner,
                      linkHref: e.target.value,
                    },
                  })
                }
                className="w-full h-10 rounded-xl bg-paper px-3 text-sm font-mono text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[0.68rem] font-mono font-bold uppercase text-ink-soft mb-1">
                Banner Urgency & Theme
              </label>
              <select
                value={structure.announcementBanner.variant || "info"}
                onChange={(e) =>
                  onChange({
                    ...structure,
                    announcementBanner: {
                      ...structure.announcementBanner,
                      variant: e.target.value as "info" | "alert" | "urgent",
                    },
                  })
                }
                className="w-full h-10 rounded-xl bg-paper px-3 text-xs font-semibold text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none"
              >
                <option value="info">Info · Signature Moss Green</option>
                <option value="alert">Alert · Warm Amber Warning</option>
                <option value="urgent">Urgent · Ruby Red Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-[0.68rem] font-mono font-bold uppercase text-ink-soft mb-1">
                Learner Dismissal
              </label>
              <label className="flex items-center gap-2 h-10 px-3 rounded-xl bg-paper shadow-[inset_0_0_0_1px_var(--line)] cursor-pointer select-none text-xs text-ink">
                <input
                  type="checkbox"
                  checked={structure.announcementBanner.dismissible !== false}
                  onChange={(e) =>
                    onChange({
                      ...structure,
                      announcementBanner: {
                        ...structure.announcementBanner,
                        dismissible: e.target.checked,
                      },
                    })
                  }
                  className="accent-[#4b5e1e] size-4 rounded cursor-pointer"
                />
                <span>Allow learners to close with '✕' button</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Navigation & Footer Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-[28px] bg-surface p-6 sm:p-8 shadow-[0_0_0_1px_var(--line)] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-display font-bold text-ink">Top Navigation Bar Links</h3>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={togglePricingVisibility}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                  isPricingVisible
                    ? "bg-moss text-on-moss shadow-xs"
                    : "bg-red-500/15 text-red-600 dark:text-red-400 shadow-[inset_0_0_0_1px_var(--line)]"
                }`}
              >
                {isPricingVisible ? "Pricing: ON" : "Pricing: OFF"}
              </button>
              <button
                type="button"
                onClick={() =>
                  onChange({ ...structure, navLinks: DEFAULT_SETTINGS.structure.navLinks })
                }
                className="text-xs font-semibold text-moss hover:underline cursor-pointer"
              >
                Reset Links
              </button>
            </div>
          </div>
          <div className="space-y-2.5">
            {(structure.navLinks || []).map((nav, idx) => (
              <div
                key={nav.id}
                className="grid grid-cols-12 gap-2 items-center bg-paper p-2 rounded-xl shadow-[inset_0_0_0_1px_var(--line)]"
              >
                <input
                  type="text"
                  value={nav.label}
                  onChange={(e) => updateNavLink(idx, { label: e.target.value })}
                  className="col-span-5 h-8 rounded-lg bg-surface px-2.5 text-xs text-ink outline-none"
                />
                <input
                  type="text"
                  value={nav.href}
                  onChange={(e) => updateNavLink(idx, { href: e.target.value })}
                  className="col-span-5 h-8 rounded-lg bg-surface px-2.5 text-xs font-mono text-ink-soft outline-none"
                />
                <label className="col-span-2 flex items-center justify-center gap-1 text-[0.7rem] text-ink cursor-pointer">
                  <input
                    type="checkbox"
                    checked={nav.visible !== false}
                    onChange={(e) => updateNavLink(idx, { visible: e.target.checked })}
                    className="accent-[#4b5e1e]"
                  />
                  Show
                </label>
              </div>
            ))}
          </div>
          <div>
            <label className="block text-[0.68rem] font-mono font-bold uppercase text-ink-soft mb-1">
              Navbar CTA Button Text (Unauthenticated Visitors)
            </label>
            <input
              type="text"
              value={structure.navCtaLabel}
              onChange={(e) => onChange({ ...structure, navCtaLabel: e.target.value })}
              className="w-full h-10 rounded-xl bg-paper px-3.5 text-sm text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none"
            />
          </div>
        </div>

        <div className="rounded-[28px] bg-surface p-6 sm:p-8 shadow-[0_0_0_1px_var(--line)] space-y-4">
          <h3 className="text-lg font-display font-bold text-ink">Footer Copy & Social Links</h3>
          <div>
            <label className="block text-[0.68rem] font-mono font-bold uppercase text-ink-soft mb-1">
              Footer Brand Description
            </label>
            <textarea
              rows={2}
              value={structure.footerDescription}
              onChange={(e) => onChange({ ...structure, footerDescription: e.target.value })}
              className="w-full rounded-xl bg-paper p-3 text-xs text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[0.68rem] font-mono font-bold uppercase text-ink-soft mb-1">
                Copyright Name
              </label>
              <input
                type="text"
                value={structure.footerCopyrightName}
                onChange={(e) => onChange({ ...structure, footerCopyrightName: e.target.value })}
                className="w-full h-9 rounded-xl bg-paper px-3 text-xs text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none"
              />
            </div>
            <div>
              <label className="block text-[0.68rem] font-mono font-bold uppercase text-ink-soft mb-1">
                Contact Email
              </label>
              <input
                type="email"
                value={structure.socialLinks.contactEmail}
                onChange={(e) =>
                  onChange({
                    ...structure,
                    socialLinks: { ...structure.socialLinks, contactEmail: e.target.value },
                  })
                }
                className="w-full h-9 rounded-xl bg-paper px-3 text-xs text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none"
              />
            </div>
          </div>
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <label className="block text-[0.68rem] font-mono font-bold uppercase text-ink-soft">
                Social Links & Channels (Auto-Renders In Footer)
              </label>
              <span className="text-[0.68rem] text-ink-soft/70">
                Uncheck to hide, or enter custom URL
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {[
                {
                  id: "twitter",
                  label: "X / Twitter",
                  placeholder: "https://x.com/...",
                  url: structure.socialLinks.twitterUrl || "",
                  enabled: structure.socialLinks.twitterEnabled !== false,
                  setUrl: (val: string) => ({ twitterUrl: val }),
                  setEnabled: (val: boolean) => ({ twitterEnabled: val }),
                },
                {
                  id: "linkedin",
                  label: "LinkedIn",
                  placeholder: "https://linkedin.com/company/...",
                  url: structure.socialLinks.linkedinUrl || "",
                  enabled: structure.socialLinks.linkedinEnabled !== false,
                  setUrl: (val: string) => ({ linkedinUrl: val }),
                  setEnabled: (val: boolean) => ({ linkedinEnabled: val }),
                },
                {
                  id: "instagram",
                  label: "Instagram",
                  placeholder: "https://instagram.com/...",
                  url: structure.socialLinks.instagramUrl || "",
                  enabled: structure.socialLinks.instagramEnabled !== false,
                  setUrl: (val: string) => ({ instagramUrl: val }),
                  setEnabled: (val: boolean) => ({ instagramEnabled: val }),
                },
                {
                  id: "youtube",
                  label: "YouTube",
                  placeholder: "https://youtube.com/@...",
                  url: structure.socialLinks.youtubeUrl || "",
                  enabled: structure.socialLinks.youtubeEnabled !== false,
                  setUrl: (val: string) => ({ youtubeUrl: val }),
                  setEnabled: (val: boolean) => ({ youtubeEnabled: val }),
                },
                {
                  id: "facebook",
                  label: "Facebook",
                  placeholder: "https://facebook.com/...",
                  url: structure.socialLinks.facebookUrl || "",
                  enabled: structure.socialLinks.facebookEnabled !== false,
                  setUrl: (val: string) => ({ facebookUrl: val }),
                  setEnabled: (val: boolean) => ({ facebookEnabled: val }),
                },
                {
                  id: "github",
                  label: "GitHub",
                  placeholder: "https://github.com/...",
                  url: structure.socialLinks.githubUrl || "",
                  enabled: structure.socialLinks.githubEnabled !== false,
                  setUrl: (val: string) => ({ githubUrl: val }),
                  setEnabled: (val: boolean) => ({ githubEnabled: val }),
                },
                {
                  id: "discord",
                  label: "Discord",
                  placeholder: "https://discord.gg/...",
                  url: structure.socialLinks.discordUrl || "",
                  enabled: structure.socialLinks.discordEnabled !== false,
                  setUrl: (val: string) => ({ discordUrl: val }),
                  setEnabled: (val: boolean) => ({ discordEnabled: val }),
                },
                {
                  id: "tiktok",
                  label: "TikTok",
                  placeholder: "https://tiktok.com/@...",
                  url: structure.socialLinks.tiktokUrl || "",
                  enabled: structure.socialLinks.tiktokEnabled !== false,
                  setUrl: (val: string) => ({ tiktokUrl: val }),
                  setEnabled: (val: boolean) => ({ tiktokEnabled: val }),
                },
                {
                  id: "telegram",
                  label: "Telegram",
                  placeholder: "https://t.me/...",
                  url: structure.socialLinks.telegramUrl || "",
                  enabled: structure.socialLinks.telegramEnabled !== false,
                  setUrl: (val: string) => ({ telegramUrl: val }),
                  setEnabled: (val: boolean) => ({ telegramEnabled: val }),
                },
              ].map((platform) => (
                <div
                  key={platform.id}
                  className="rounded-xl bg-paper p-2.5 shadow-[inset_0_0_0_1px_var(--line)] space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[0.66rem] font-mono font-bold uppercase text-ink">
                      {platform.label}
                    </span>
                    <label className="flex items-center gap-1 text-[0.68rem] text-ink-soft cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={platform.enabled}
                        onChange={(e) =>
                          onChange({
                            ...structure,
                            socialLinks: {
                              ...structure.socialLinks,
                              ...platform.setEnabled(e.target.checked),
                            },
                          })
                        }
                        className="accent-[#4b5e1e]"
                      />
                      Show
                    </label>
                  </div>
                  <input
                    type="text"
                    placeholder={platform.placeholder}
                    value={platform.url}
                    onChange={(e) =>
                      onChange({
                        ...structure,
                        socialLinks: {
                          ...structure.socialLinks,
                          ...platform.setUrl(e.target.value),
                        },
                      })
                    }
                    className="w-full h-8 rounded-lg bg-surface px-2.5 text-xs text-ink outline-none placeholder:text-ink-soft/40 shadow-[inset_0_0_0_1px_var(--line)] focus:shadow-[inset_0_0_0_1.5px_var(--moss)]"
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[0.65rem] font-mono font-bold uppercase text-ink-soft mb-1">
                Footer Sub-Note
              </label>
              <input
                type="text"
                value={structure.footerSubNote}
                onChange={(e) => onChange({ ...structure, footerSubNote: e.target.value })}
                className="w-full h-9 rounded-lg bg-paper px-2.5 text-xs text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none"
              />
            </div>
            <div>
              <label className="block text-[0.65rem] font-mono font-bold uppercase text-ink-soft mb-1">
                Footer Right Note
              </label>
              <input
                type="text"
                value={structure.footerRightNote}
                onChange={(e) => onChange({ ...structure, footerRightNote: e.target.value })}
                className="w-full h-9 rounded-lg bg-paper px-2.5 text-xs text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none"
              />
            </div>
          </div>
        </div>

        <div className="rounded-[28px] bg-surface p-6 sm:p-8 shadow-[0_0_0_1px_var(--line)] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-display font-bold text-ink">
                SEO, Analytics &amp; Head Tags
              </h3>
              <p className="text-xs text-ink-soft mt-0.5">
                Configure live tracking tags and search engine verification tokens without manual deployments.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-lime-soft text-moss font-mono text-[0.68rem] font-bold uppercase">
              Web &amp; Crawlers
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[0.68rem] font-mono font-bold uppercase text-ink-soft mb-1">
                Google Analytics (GA4) Measurement ID
              </label>
              <input
                type="text"
                placeholder="G-XXXXXXXXXX"
                value={structure.googleAnalyticsId || ""}
                onChange={(e) =>
                  onChange({ ...structure, googleAnalyticsId: e.target.value.trim() })
                }
                className="w-full h-10 rounded-xl bg-paper px-3 text-xs font-mono text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none placeholder:text-ink-soft/40"
              />
              <span className="text-[0.65rem] text-ink-soft mt-1 block">
                Auto-injects official gtag.js across all pages.
              </span>
            </div>

            <div>
              <label className="block text-[0.68rem] font-mono font-bold uppercase text-ink-soft mb-1">
                Google Search Console Token
              </label>
              <input
                type="text"
                placeholder="e.g. your verification code from HTML tag"
                value={structure.googleSearchConsoleToken || ""}
                onChange={(e) =>
                  onChange({
                    ...structure,
                    googleSearchConsoleToken: e.target.value.trim(),
                  })
                }
                className="w-full h-10 rounded-xl bg-paper px-3 text-xs font-mono text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none placeholder:text-ink-soft/40"
              />
              <span className="text-[0.65rem] text-ink-soft mt-1 block">
                Injects &lt;meta name=&quot;google-site-verification&quot; content=&quot;...&quot;&gt;
              </span>
            </div>
          </div>

          <div>
            <label className="block text-[0.68rem] font-mono font-bold uppercase text-ink-soft mb-1">
              Custom &lt;head&gt; Scripts &amp; Tracking Pixels (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="<!-- Paste custom Microsoft Clarity, Meta Pixel, or analytics scripts here -->"
              value={structure.customHeadScripts || ""}
              onChange={(e) =>
                onChange({ ...structure, customHeadScripts: e.target.value })
              }
              className="w-full rounded-xl bg-paper p-3 text-xs font-mono text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none placeholder:text-ink-soft/40"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

