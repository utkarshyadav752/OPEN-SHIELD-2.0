/**
 * OpenShield — Taxonomy Signatures, Pre-Rated ToS;DR Services & JustDeleteMe Index
 * Combines:
 * 1. Princeton Dark Patterns Dataset (aruneshmathur/dark-patterns)
 * 2. DPBH EthiGuard (XRegiGigaSX/DarkPatternBusterHackathon_EthiGuard)
 * 3. ToS;DR & Terms of Service Corpus (tosdr/browser-extensions & sonu-gupta/tosdr-terms-of-service-corpus)
 * 4. Consent-O-Matic styleFilter (cavi-au/Consent-O-Matic)
 * 5. JustDeleteMe (jdm-contrib/jdm)
 */

window.OPENSHIELD_CONSTANTS = {
  URGENCY_PATTERNS: [
    /only \d+ left in stock/i,
    /\d+ people are (viewing|looking at|booking) this/i,
    /offer expires in|deal ends in/i,
    /hurry!|selling fast|almost gone/i,
    /last chance to book/i,
    /\b\d{1,2}:\d{2}:\d{2}\b/
  ],

  SCARCITY_PATTERNS: [
    /only \d+ left( in stock| at this price)?/i,
    /almost gone|selling fast/i,
    /in high demand|9\d% of (rooms|seats) booked/i
  ],

  SOCIAL_PROOF_PATTERNS: [
    /\d+ people are (viewing|looking at|booking|watching) this/i,
    /\d+ (people|travelers|customers) (bought|booked|purchased) this in the last/i
  ],

  CONFIRM_SHAMING_PATTERNS: [
    /no thanks,?\s*i (don't|do not) (want|like)/i,
    /no,?\s*i prefer to pay full price/i,
    /i hate saving money/i,
    /continue without protection/i,
    /no thanks,?\s*i'll risk it/i,
    /risk losing my luggage/i
  ],

  TOS_RED_FLAGS: [
    {
      id: "TOS-ARB",
      pattern: /waive.*class action|binding arbitration/i,
      label: "Forced Arbitration & Class-Action Waiver",
      severity: "critical",
      points: 25
    },
    {
      id: "TOS-SELL",
      pattern: /sell.*third[- ]party|share with marketing partners/i,
      label: "Sells Personal Data to Third Parties",
      severity: "critical",
      points: 25
    },
    {
      id: "TOS-RENEW",
      pattern: /auto[- ]?renew|automatically billed|recurring charge/i,
      label: "Sneaky Auto-Renewal Subscription",
      severity: "high",
      points: 15
    },
    {
      id: "TOS-NOREFUND",
      pattern: /non[- ]refundable|no refunds under any circumstances/i,
      label: "Strict No-Refund Clause",
      severity: "high",
      points: 15
    },
    {
      id: "TOS-LICENSE",
      pattern: /irrevocable,?\s*perpetual.*license/i,
      label: "Claims Permanent Ownership of Your Content",
      severity: "high",
      points: 15
    },
    {
      id: "TOS-UNILATERAL",
      pattern: /modify these terms at any time without notice/i,
      label: "Can Change Rules Anytime Without Notice",
      severity: "medium",
      points: 10
    }
  ],

  // ToS;DR Hybrid Pre-Rated Domain Database (Class A to Class E)
  TOSDR_PRE_RATED_SERVICES: {
    "duckduckgo.com": { name: "DuckDuckGo", classGrade: "A", summary: "Does not track you or sell personal data." },
    "proton.me": { name: "Proton", classGrade: "A", summary: "End-to-end encrypted; clear jurisdiction and zero data monetization." },
    "signal.org": { name: "Signal", classGrade: "A", summary: "Minimal metadata retention and open-source privacy guarantees." },
    "wikipedia.org": { name: "Wikipedia", classGrade: "B", summary: "Transparent community governance and clear licensing." },
    "github.com": { name: "GitHub", classGrade: "B", summary: "Clear IP ownership for user repositories and straightforward account deletion." },
    "netflix.com": { name: "Netflix", classGrade: "C", summary: "Easy cancellation, though includes arbitration clauses in select regions." },
    "amazon.com": { name: "Amazon", classGrade: "D", summary: "Extensive behavioral tracking, third-party ad sharing, and multi-step Prime cancellation." },
    "tiktok.com": { name: "TikTok", classGrade: "E", summary: "Broad perpetual content license, cross-device biometric/location tracking." },
    "shadyairlines.example": { name: "ShadyAirlines", classGrade: "E", summary: "Predatory arbitration waiver, non-refundable drip pricing, and third-party data resale." }
  },

  // Consent-O-Matic Inspired Declarative Style Auditor Thresholds
  STYLE_AUDITOR_CONFIG: {
    minPrimaryToSecondaryAreaRatio: 2.8,
    maxShameLinkFontSizePx: 12,
    lowContrastLuminanceDelta: 0.25
  },

  // Bundled JustDeleteMe Fallback Dataset
  JUST_DELETE_ME_SITES: [
    {
      name: "ShadyAirlines",
      domains: ["shadyairlines.example", "localhost", "127.0.0.1"],
      difficulty: "hard",
      url: "https://shadyairlines.example/account/cancel-membership-step-1",
      notes: "Requires navigating 4 retention screens, disabling ShadyClub Gold auto-renewal 72h prior, and calling support."
    },
    {
      name: "Amazon",
      domains: ["amazon.com", "amazon.in", "amazon.co.uk"],
      difficulty: "medium",
      url: "https://www.amazon.com/gp/help/customer/display.html?nodeId=GTJQ7QZY7QL2HK4Y",
      notes: "Multi-step Prime cancellation flow ('Iliad Flow') with repeated retention prompts."
    },
    {
      name: "Adobe Creative Cloud",
      domains: ["adobe.com"],
      difficulty: "hard",
      url: "https://account.adobe.com/plans",
      notes: "Annual plans paid monthly incur a 50% early termination penalty after 14 days."
    },
    {
      name: "Planet Fitness",
      domains: ["planetfitness.com"],
      difficulty: "impossible",
      url: "https://www.planetfitness.com/about-planet-fitness/customer-service/membership-faqs",
      notes: "Requires in-person visit to home club or certified postal mail in most regions."
    },
    {
      name: "Netflix",
      domains: ["netflix.com"],
      difficulty: "easy",
      url: "https://www.netflix.com/youraccount",
      notes: "Clean 2-click self-service cancellation from Account overview."
    }
  ]
};
