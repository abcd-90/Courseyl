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

const TYPO_DOMAIN_SUGGESTIONS: Record<string, string> = {
  "gmial.com": "gmail.com",
  "gmal.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gmail.co": "gmail.com",
  "gmail.con": "gmail.com",
  "gnail.com": "gmail.com",
  "yaho.com": "yahoo.com",
  "yahooo.com": "yahoo.com",
  "yhoo.com": "yahoo.com",
  "yahoo.co": "yahoo.com",
  "hotmai.com": "hotmail.com",
  "hotmal.com": "hotmail.com",
  "hotamil.com": "hotmail.com",
  "outlok.com": "outlook.com",
  "outllok.com": "outlook.com",
  "iclod.com": "icloud.com",
  "icloud.co": "icloud.com",
  "protonmai.com": "protonmail.com",
};

const DUMMY_FREE_LOCAL_PARTS = new Set([
  "test",
  "testing",
  "fake",
  "dummy",
  "sample",
  "demo",
  "example",
  "asdf",
  "asdfgh",
  "qwer",
  "qwerty",
  "abc",
  "xyz",
  "123",
  "1234",
  "12345",
  "123456",
  "noreply",
  "no-reply",
]);

const FREE_WEBMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "icloud.com",
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
  const localPart = parts[0] || "";
  const domain = parts[1];
  const tld = domain.split(".").pop() || "";

  if (!domain || tld.length < 2 || domain === "example.com" || domain === "example.org" || domain === "test.com") {
    return {
      valid: false,
      cleanEmail,
      error: "Please use your real personal or work email address.",
    };
  }

  const typoSuggestion = TYPO_DOMAIN_SUGGESTIONS[domain];
  if (typoSuggestion) {
    return {
      valid: false,
      cleanEmail,
      error: `Did you mean ${localPart}@${typoSuggestion}? Please check the spelling of your email domain.`,
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

  if (FREE_WEBMAIL_DOMAINS.has(domain)) {
    const baseLocal = localPart.split("+")[0] || "";
    if (DUMMY_FREE_LOCAL_PARTS.has(baseLocal)) {
      return {
        valid: false,
        cleanEmail,
        error:
          "Test or placeholder addresses are blocked to prevent bounced mail. Please use your real inbox.",
      };
    }
    if (domain === "gmail.com" || domain === "googlemail.com") {
      const normalizedGmail = baseLocal.replace(/\./g, "");
      if (normalizedGmail.length < 6) {
        return {
          valid: false,
          cleanEmail,
          error:
            "Gmail usernames require at least 6 characters. Please enter a valid Gmail address.",
        };
      }
    }
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

