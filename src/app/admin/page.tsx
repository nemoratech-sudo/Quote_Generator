"use client";

import { FormEvent, useEffect, useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import { formatINR } from "@/lib/money";
import {
  DEFAULT_PACKAGES,
  loadPackages,
  resetPackages,
  savePackages,
} from "@/lib/packages";
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from "@/lib/settings";
import type { AppSettings, Package, PackageFeature } from "@/lib/types";

export default function AdminPage() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setPackages(loadPackages());
    setSettings(loadSettings());
  }, []);

  function updatePackage(index: number, patch: Partial<Package>) {
    setPackages((current) =>
      current.map((pkg, i) => {
        if (i !== index) return pkg;
        const next = { ...pkg, ...patch };
        const sum = next.features.reduce((s, f) => s + f.amount, 0);
        if (patch.features) {
          next.baseAmount = sum;
          next.price = formatINR(sum) + (next.id === "premium" ? "+" : "");
        }
        return next;
      }),
    );
  }

  function updateFeature(
    packageIndex: number,
    featureIndex: number,
    patch: Partial<PackageFeature>,
  ) {
    setPackages((current) =>
      current.map((pkg, i) => {
        if (i !== packageIndex) return pkg;
        const features = pkg.features.map((feature, fi) =>
          fi === featureIndex ? { ...feature, ...patch } : feature,
        );
        const baseAmount = features.reduce((s, f) => s + f.amount, 0);
        return {
          ...pkg,
          features,
          baseAmount,
          price: formatINR(baseAmount) + (pkg.id === "premium" ? "+" : ""),
        };
      }),
    );
  }

  function addFeature(packageIndex: number) {
    setPackages((current) =>
      current.map((pkg, i) => {
        if (i !== packageIndex) return pkg;
        const features = [...pkg.features, { description: "New feature", amount: 500 }];
        const baseAmount = features.reduce((s, f) => s + f.amount, 0);
        return {
          ...pkg,
          features,
          baseAmount,
          price: formatINR(baseAmount) + (pkg.id === "premium" ? "+" : ""),
        };
      }),
    );
  }

  function removeFeature(packageIndex: number, featureIndex: number) {
    setPackages((current) =>
      current.map((pkg, i) => {
        if (i !== packageIndex) return pkg;
        const features = pkg.features.filter((_, fi) => fi !== featureIndex);
        const baseAmount = features.reduce((s, f) => s + f.amount, 0);
        return {
          ...pkg,
          features,
          baseAmount,
          price: formatINR(baseAmount) + (pkg.id === "premium" ? "+" : ""),
        };
      }),
    );
  }

  function handleSavePackages(event: FormEvent) {
    event.preventDefault();
    savePackages(packages);
    setMessage("Packages saved to this browser.");
  }

  function handleSaveSettings(event: FormEvent) {
    event.preventDefault();
    saveSettings(settings);
    setMessage("Settings saved. New quotes will use these defaults.");
  }

  function handleResetPackages() {
    const defaults = resetPackages();
    setPackages(defaults);
    setMessage("Packages restored to Nemora defaults.");
  }

  return (
    <div className="page-atmosphere">
      <SiteHeader compact />
      <main className="mx-auto w-full max-w-5xl px-5 pb-20 pt-6 sm:px-8">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-forest/70">
            Configuration
          </p>
          <h1 className="mt-1 font-serif text-4xl text-forest">Admin</h1>
          <p className="mt-2 max-w-2xl text-charcoal/65">
            Adjust package feature rates, GST defaults, and quote numbering. Changes stay in
            localStorage on this device — no server required.
          </p>
        </div>

        {message && (
          <p className="mb-6 rounded-xl bg-sage/60 px-4 py-3 text-sm font-medium text-forest">
            {message}
          </p>
        )}

        <form
          onSubmit={handleSaveSettings}
          className="mb-10 rounded-[1.5rem] border border-white/70 bg-white/90 p-6 shadow-sm"
        >
          <h2 className="font-serif text-2xl text-forest">Defaults</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-charcoal/60">Quote ID prefix</span>
              <input
                type="text"
                value={settings.quotePrefix}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, quotePrefix: e.target.value.toUpperCase() }))
                }
                className="w-full rounded-xl border border-charcoal/10 px-3 py-2.5 outline-none focus:border-forest/30"
              />
              <span className="mt-1 block text-xs text-charcoal/45">
                Example: NMR-2026-0001
              </span>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-charcoal/60">Validity (days)</span>
              <input
                type="number"
                min={1}
                value={settings.validityDays}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    validityDays: Math.max(1, Number(e.target.value) || 15),
                  }))
                }
                className="w-full rounded-xl border border-charcoal/10 px-3 py-2.5 outline-none focus:border-forest/30"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-charcoal/60">GST percent</span>
              <input
                type="number"
                min={0}
                max={40}
                value={settings.gstPercent}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    gstPercent: Math.max(0, Number(e.target.value) || 0),
                  }))
                }
                className="w-full rounded-xl border border-charcoal/10 px-3 py-2.5 outline-none focus:border-forest/30"
              />
            </label>
            <label className="flex items-center gap-3 pt-6 text-sm font-medium text-charcoal">
              <input
                type="checkbox"
                checked={settings.gstEnabledDefault}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, gstEnabledDefault: e.target.checked }))
                }
                className="h-4 w-4 accent-[var(--forest)]"
              />
              Enable GST by default on new quotes
            </label>
          </div>
          <button
            type="submit"
            className="mt-6 rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-white"
          >
            Save settings
          </button>
        </form>

        <form onSubmit={handleSavePackages} className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-serif text-2xl text-forest">Packages & rates</h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleResetPackages}
                className="rounded-full border border-charcoal/15 bg-white px-4 py-2 text-sm font-semibold"
              >
                Reset to defaults
              </button>
              <button
                type="submit"
                className="rounded-full bg-forest px-5 py-2 text-sm font-semibold text-white"
              >
                Save packages
              </button>
            </div>
          </div>

          {packages.map((pkg, packageIndex) => (
            <div
              key={pkg.id}
              className="rounded-[1.5rem] border border-white/70 bg-white/90 p-6 shadow-sm"
            >
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-2xl" aria-hidden>
                    {pkg.medal}
                  </p>
                  <h3 className="font-serif text-xl text-forest">{pkg.name}</h3>
                  <p className="text-sm text-charcoal/55">
                    Base total {formatINR(pkg.baseAmount)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => addFeature(packageIndex)}
                  className="text-sm font-semibold text-forest hover:underline"
                >
                  + Add feature
                </button>
              </div>

              <ul className="mt-4 space-y-2">
                {pkg.features.map((feature, featureIndex) => (
                  <li
                    key={`${pkg.id}-${featureIndex}`}
                    className="flex flex-col gap-2 rounded-xl border border-charcoal/8 bg-sage-soft/30 p-3 sm:flex-row sm:items-center"
                  >
                    <input
                      type="text"
                      value={feature.description}
                      onChange={(e) =>
                        updateFeature(packageIndex, featureIndex, {
                          description: e.target.value,
                        })
                      }
                      className="min-w-0 flex-1 rounded-lg border border-charcoal/10 bg-white px-3 py-2 text-sm outline-none focus:border-forest/30"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-charcoal/45">₹</span>
                      <input
                        type="number"
                        min={0}
                        value={feature.amount}
                        onChange={(e) =>
                          updateFeature(packageIndex, featureIndex, {
                            amount: Math.max(0, Number(e.target.value) || 0),
                          })
                        }
                        className="w-28 rounded-lg border border-charcoal/10 bg-white px-3 py-2 text-sm outline-none focus:border-forest/30"
                      />
                      <button
                        type="button"
                        onClick={() => removeFeature(packageIndex, featureIndex)}
                        className="text-xs font-semibold text-red-700/80"
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {packages.length === 0 && (
            <p className="text-charcoal/50">
              No packages loaded.{" "}
              <button
                type="button"
                className="font-semibold text-forest underline"
                onClick={() => setPackages(DEFAULT_PACKAGES)}
              >
                Load defaults
              </button>
            </p>
          )}
        </form>
      </main>
    </div>
  );
}
