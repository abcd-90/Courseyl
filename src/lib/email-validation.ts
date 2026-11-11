import dns from "node:dns/promises";

const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "10minutemail.com",
  "10minutemail.net",
  "dispostable.com",
  "fakeinbox.com",
  "getnada.com",
  "guerrillamail.com",
  "guerrillamail.info",
  "guerrillamail.net",
  "guerrillamail.org",
  "guerrillamailblock.com",
  "maildrop.cc",
  "mailinator.com",
  "mailinator.net",
  "mailnesia.com",
  "mintemail.com",
  "mohmal.com",
  "sharklasers.com",
  "temp-mail.io",
  "temp-mail.org",
  "tempmail.com",
  "tempmail.dev",
  "throwawaymail.com",
  "trashmail.com",
  "trashmail.me",
  "yopmail.com",
  "yopmail.fr",
  "yopmail.net",
]);

export interface EmailValidationResult {
  valid: boolean;
  cleanEmail: string;
  error?: string;
}

/**
 * Validates syntax, rejects disposable domains, and performs live DNS MX lookup
 * so invalid or nonexistent mail domains are rejected before sending confirmation mail.
 */
export async function validateRealEmailAddress(
  rawEmail: unknown
): Promise<EmailValidationResult> {
  if (typeof rawEmail !== "string") {
    return {
      valid: false,
      cleanEmail: "",
      error: "Please enter a valid email address.",
    };
  }

  const cleanEmail = rawEmail.trim().toLowerCase();
  const emailRegex = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/;

  if (!cleanEmail || cleanEmail.length > 254 || !emailRegex.test(cleanEmail)) {
    return {
      valid: false,
      cleanEmail,
      error: "Please enter a valid email address format.",
    };
  }

  const parts = cleanEmail.split("@");
  const domain = parts[1];
  const tld = domain.split(".").pop() || "";

  if (!domain || tld.length < 2 || domain === "example.com" || domain === "example.org" || domain === "test.com") {
    return {
      valid: false,
      cleanEmail,
      error: "Please use your real personal or work email address.",
    };
  }

  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
    return {
      valid: false,
      cleanEmail,
      error:
        "Temporary or disposable email addresses are not allowed. Please use a real email inbox.",
    };
  }

  try {
    const mxPromise = dns.resolveMx(domain);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("DNS_TIMEOUT")), 3000)
    );
    const records = await Promise.race([mxPromise, timeoutPromise]);
    if (!Array.isArray(records) || records.length === 0) {
      return {
        valid: false,
        cleanEmail,
        error: `No mail server found for "${domain}". Please check your email address.`,
      };
    }
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (
      code === "ENOTFOUND" ||
      code === "ENODATA" ||
      code === "NXDOMAIN" ||
      code === "ESERVFAIL"
    ) {
      return {
        valid: false,
        cleanEmail,
        error: `Cannot deliver confirmation mail to "@${domain}" (domain has no active mail server).`,
      };
    }
    // Transient DNS timeout: allow continuing cleanly
  }

  return { valid: true, cleanEmail };
}

