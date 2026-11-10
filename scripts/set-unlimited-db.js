require("dotenv").config();
const { Client } = require("pg");

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  console.log("Connected to Supabase PostgreSQL.");

  // 1. Update site_plans platform setting
  const plansData = {
    freeHoursLimit: 9999,
    freeGenerationsLimit: 9999,
    unlimitedFreeMode: true,
    proPriceMonthly: 12,
    proHoursLimit: 40,
    proGenerationsLimit: 25,
    maxPriceMonthly: 29,
    maxHoursLimit: 120,
    maxGenerationsLimit: 100,
    allowNewSignups: true,
    maintenanceMode: false,
    maintenanceMessage: "",
  };

  await client.query(`
    INSERT INTO "PlatformSetting" (id, key, value, "updatedAt")
    VALUES (
      'setting_site_plans',
      'site_plans',
      $1,
      NOW()
    )
    ON CONFLICT (key) DO UPDATE
    SET value = $1, "updatedAt" = NOW()
  `, [JSON.stringify(plansData)]);

  console.log("✅ Updated site_plans: unlimitedFreeMode = true, freeHoursLimit = 9999.");

  // 2. Ensure site_branding brandName is Courseyl
  const currentBrandingRes = await client.query(`
    SELECT value FROM "PlatformSetting" WHERE key = 'site_branding'
  `);

  let brandingData = {
    brandName: "Courseyl",
    tagline: "Turn any YouTube video into a course you actually finish.",
    subTagline: "Structured lessons, active recall quizzes, interactive note-taking, and personalized placement tests in one distraction-free space.",
    badgeText: "No distraction between your studies",
    logoIcon: "grad-cap",
    customLogoUrl: "",
    primaryColor: "#0f1611",
    accentColor: "#4b5e1e",
    darkBgColor: "#0e1311",
    lightBgColor: "#fcfcfa",
    fontFamily: "Familjen Grotesk",
  };

  if (currentBrandingRes.rows.length > 0) {
    try {
      const parsed = JSON.parse(currentBrandingRes.rows[0].value);
      brandingData = { ...brandingData, ...parsed, brandName: "Courseyl" };
    } catch {}
  }

  await client.query(`
    INSERT INTO "PlatformSetting" (id, key, value, "updatedAt")
    VALUES (
      'setting_site_branding',
      'site_branding',
      $1,
      NOW()
    )
    ON CONFLICT (key) DO UPDATE
    SET value = $1, "updatedAt" = NOW()
  `, [JSON.stringify(brandingData)]);

  console.log("✅ Updated site_branding: brandName = 'Courseyl'.");

  await client.end();
}

main().catch(console.error);

