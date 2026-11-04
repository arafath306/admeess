// ─── Mock User ────────────────────────────────────────────────────────────────

export const mockUser = {
  id: "USR-0048291",
  username: "photo_artist",
  displayName: "Alex Rivera",
  email: "alex@example.com",
  phone: "+1 (555) 847-2901",
  createdAt: "January 15, 2023",
  lastLogin: "2 minutes ago",
  lastActive: "Just now",
  location: "Los Angeles, CA",
  badges: ["blue_verified"] as string[],
  premium: { active: true, plan: "Pro", since: "Mar 2023" },
  monetization: { active: true, since: "Jun 2023" },
  status: "active" as "active" | "suspended" | "disabled" | "banned",
  riskLevel: "low" as "low" | "medium" | "high" | "critical",
  trustScore: 94,
  // Quick stats
  followers: 48291,
  following: 892,
  totalPosts: 1284,
  totalComments: 4821,
  totalLikes: 284102,
  communitiesJoined: 12,
  communitiesCreated: 2,
  imagesUploaded: 892,
  videosUploaded: 124,
  storageUsed: "4.2 GB",
  storagePercent: 42,
  reportCount: 3,
  warningCount: 0,
  loginCount: 1284,
  accountAgeDays: 1264,
}

// ─── Activity Chart Data ───────────────────────────────────────────────────────

export const activityChartData = [
  { month: "Jul", posts: 48, comments: 182, likes: 1840 },
  { month: "Aug", posts: 62, comments: 241, likes: 2210 },
  { month: "Sep", posts: 54, comments: 198, likes: 1960 },
  { month: "Oct", posts: 78, comments: 284, likes: 3120 },
  { month: "Nov", posts: 92, comments: 341, likes: 4280 },
  { month: "Dec", posts: 84, comments: 312, likes: 3840 },
  { month: "Jan", posts: 38, comments: 141, likes: 1820 },
]

export const postingFrequencyData = [
  { day: "Mon", posts: 3 },
  { day: "Tue", posts: 5 },
  { day: "Wed", posts: 2 },
  { day: "Thu", posts: 7 },
  { day: "Fri", posts: 4 },
  { day: "Sat", posts: 8 },
  { day: "Sun", posts: 6 },
]

export const engagementData = [
  { week: "W1", rate: 6.2 },
  { week: "W2", rate: 7.8 },
  { week: "W3", rate: 5.9 },
  { week: "W4", rate: 8.4 },
  { week: "W5", rate: 9.1 },
  { week: "W6", rate: 7.3 },
  { week: "W7", rate: 8.8 },
  { week: "W8", rate: 10.2 },
]

// ─── Profile Data ──────────────────────────────────────────────────────────────

export const usernameHistory = [
  { username: "photo_artist", since: "Jan 2023", current: true },
  { username: "alexrivera_photos", since: "Nov 2022", current: false },
  { username: "ar_photography", since: "Sep 2022", current: false },
]

export const displayNameHistory = [
  { name: "Alex Rivera", since: "Jan 2023", current: true },
  { name: "Alex R. Photography", since: "Oct 2022", current: false },
  { name: "Alexander Rivera", since: "Sep 2022", current: false },
]

export const badgeHistory = [
  { badge: "Blue Verified", granted: "Mar 14, 2023", by: "Admin", method: "Application", active: true },
]

// ─── Activity Timeline ─────────────────────────────────────────────────────────

export const activityEvents = [
  { id: 1, type: "login", description: "Logged in from Los Angeles, CA", device: "Chrome / macOS", ip: "192.168.1.1", time: "2 min ago" },
  { id: 2, type: "post", description: "Published post: 'Golden Hour Photography Tips'", time: "1h ago" },
  { id: 3, type: "profile_edit", description: "Updated bio text", time: "3h ago" },
  { id: 4, type: "login", description: "Logged in from Los Angeles, CA", device: "iPhone 16 / iOS 18", ip: "192.168.1.2", time: "8h ago" },
  { id: 5, type: "setting", description: "Changed notification preferences", time: "1d ago" },
  { id: 6, type: "password", description: "Password changed successfully", time: "3d ago" },
  { id: 7, type: "login", description: "Logged in from San Francisco, CA", device: "Safari / macOS", ip: "10.0.0.1", time: "5d ago" },
  { id: 8, type: "privacy", description: "Changed account visibility to Public", time: "1w ago" },
  { id: 9, type: "device", description: "New device added: MacBook Pro 16\"", time: "2w ago" },
  { id: 10, type: "username", description: "Username changed to photo_artist", time: "3w ago" },
]

// ─── Posts ────────────────────────────────────────────────────────────────────

export const posts = [
  { id: "P-8841", title: "Golden Hour Photography Tips", type: "text", status: "published", views: 12840, likes: 2841, comments: 184, created: "3h ago" },
  { id: "P-8840", title: "Behind the Lens: LA Street Art Series", type: "image", status: "published", views: 8294, likes: 1920, comments: 92, created: "1d ago" },
  { id: "P-8839", title: "Lightroom Presets Pack Review", type: "video", status: "published", views: 24810, likes: 4281, comments: 341, created: "2d ago" },
  { id: "P-8838", title: "Composition Rules You're Breaking (and why that's OK)", type: "text", status: "published", views: 19284, likes: 3841, comments: 281, created: "4d ago" },
  { id: "P-8837", title: "Gear Talk: Best Cameras Under $1,000", type: "image", status: "published", views: 31284, likes: 6284, comments: 492, created: "1w ago" },
  { id: "P-8836", title: "Draft: Color Theory for Photographers", type: "text", status: "draft", views: 0, likes: 0, comments: 0, created: "1w ago" },
  { id: "P-8821", title: "How to Shoot in Harsh Sunlight", type: "image", status: "archived", views: 8104, likes: 1284, comments: 97, created: "2mo ago" },
  { id: "P-8809", title: "Deleted Content", type: "text", status: "deleted", views: 284, likes: 12, comments: 3, created: "3mo ago" },
]

// ─── Communities ───────────────────────────────────────────────────────────────

export const communities = [
  { id: "C-001", name: "Photography Enthusiasts", role: "Member", members: 284102, joined: "Jan 2023", posts: 284, warnings: 0 },
  { id: "C-002", name: "LA Street Art", role: "Moderator", members: 48291, joined: "Feb 2023", posts: 128, warnings: 0 },
  { id: "C-003", name: "Camera Gear Reviews", role: "Admin", members: 12840, joined: "Mar 2023", posts: 92, warnings: 0 },
  { id: "C-004", name: "Adobe Lightroom Users", role: "Member", members: 84291, joined: "Apr 2023", posts: 41, warnings: 0 },
  { id: "C-005", name: "Portrait Photography", role: "Member", members: 29184, joined: "May 2023", posts: 18, warnings: 0 },
  { id: "C-006", name: "Travel Photography", role: "Member", members: 184291, joined: "Jun 2023", posts: 12, warnings: 0 },
]

// ─── Media ────────────────────────────────────────────────────────────────────

export const mediaItems = [
  { id: "M-001", name: "golden_hour_01.jpg", type: "image", size: "4.2 MB", uploaded: "3h ago", dimensions: "6000×4000", format: "JPEG" },
  { id: "M-002", name: "street_art_LA.jpg", type: "image", size: "6.8 MB", uploaded: "1d ago", dimensions: "5472×3648", format: "JPEG" },
  { id: "M-003", name: "lightroom_review.mp4", type: "video", size: "284 MB", uploaded: "2d ago", duration: "12:42", format: "MP4" },
  { id: "M-004", name: "portrait_session.jpg", type: "image", size: "5.1 MB", uploaded: "4d ago", dimensions: "4800×3200", format: "JPEG" },
  { id: "M-005", name: "gear_review_2026.mp4", type: "video", size: "512 MB", uploaded: "1w ago", duration: "28:14", format: "MP4" },
  { id: "M-006", name: "presets_pack.zip", type: "document", size: "18 MB", uploaded: "2w ago", format: "ZIP" },
  { id: "M-007", name: "bts_studio.jpg", type: "image", size: "3.9 MB", uploaded: "3w ago", dimensions: "5504×3672", format: "JPEG" },
  { id: "M-008", name: "composition_guide.jpg", type: "image", size: "2.8 MB", uploaded: "1mo ago", dimensions: "4200×2800", format: "JPEG" },
]

// ─── Reports ──────────────────────────────────────────────────────────────────

export const reports = [
  { id: "RPT-1842", type: "Spam", reporter: "@user_84291", status: "resolved", evidence: "Promotional comment on unrelated post", resolution: "No action — educational comment", moderator: "mod_sarah", created: "Jan 2, 2026" },
  { id: "RPT-1729", type: "Misinformation", reporter: "@user_28491", status: "resolved", evidence: "Post about camera specs", resolution: "No violation found — factual content", moderator: "mod_james", created: "Dec 20, 2025" },
  { id: "RPT-1584", type: "Copyright", reporter: "@photo_corp", status: "dismissed", evidence: "Image ownership dispute", resolution: "Original content verified", moderator: "mod_sarah", created: "Nov 15, 2025" },
]

// ─── Moderation ───────────────────────────────────────────────────────────────

export const moderationHistory = [
  { id: "MOD-001", type: "none", description: "Account in good standing — no violations", date: "Jan 3, 2026" },
]

// ─── Monetization ─────────────────────────────────────────────────────────────

export const monetizationData = {
  status: "active",
  totalEarnings: 18420,
  pendingPayout: 1284,
  lastPayout: 2841,
  lastPayoutDate: "Jan 1, 2026",
  cpm: 4.82,
  rpm: 3.91,
  subscribers: 2841,
  monthlyRevenue: [
    { month: "Aug", earnings: 1840 },
    { month: "Sep", earnings: 2120 },
    { month: "Oct", earnings: 2480 },
    { month: "Nov", earnings: 2841 },
    { month: "Dec", earnings: 3184 },
    { month: "Jan", earnings: 841 },
  ],
}

export const payoutHistory = [
  { id: "PAY-484", amount: 2841, method: "PayPal", status: "paid", date: "Jan 1, 2026" },
  { id: "PAY-421", amount: 3184, method: "Bank Transfer", status: "paid", date: "Dec 1, 2025" },
  { id: "PAY-384", amount: 2480, method: "PayPal", status: "paid", date: "Nov 1, 2025" },
  { id: "PAY-341", amount: 2120, method: "PayPal", status: "paid", date: "Oct 1, 2025" },
]

// ─── Devices ──────────────────────────────────────────────────────────────────

export const devices = [
  { id: "DEV-001", name: "MacBook Pro 16\"", browser: "Chrome 131", os: "macOS Sequoia 15.2", ip: "192.168.1.1", lastActive: "2 min ago", method: "Email/Password", trusted: true, current: true },
  { id: "DEV-002", name: "iPhone 16 Pro", browser: "Safari 18", os: "iOS 18.2", ip: "192.168.1.2", lastActive: "8h ago", method: "Biometric", trusted: true, current: false },
  { id: "DEV-003", name: "iPad Pro 13\"", browser: "Chrome 131", os: "iPadOS 18.2", ip: "10.0.0.5", lastActive: "3d ago", method: "Email/Password", trusted: true, current: false },
  { id: "DEV-004", name: "Windows PC", browser: "Edge 131", os: "Windows 11", ip: "72.184.201.18", lastActive: "2w ago", method: "Email/Password", trusted: false, current: false },
]

// ─── Sessions ─────────────────────────────────────────────────────────────────

export const sessions = [
  { id: "SES-0841", device: "MacBook Pro 16\"", os: "macOS / Chrome", ip: "192.168.1.1", location: "Los Angeles, CA", started: "Today 9:32 AM", status: "active", duration: "2h 14m" },
  { id: "SES-0840", device: "iPhone 16 Pro", os: "iOS / Safari", ip: "192.168.1.2", location: "Los Angeles, CA", started: "Today 7:18 AM", status: "inactive", duration: "1h 02m" },
  { id: "SES-0839", device: "iPad Pro", os: "iPadOS / Chrome", ip: "10.0.0.5", location: "Los Angeles, CA", started: "Jan 1, 2026", status: "expired", duration: "4h 22m" },
  { id: "SES-0821", device: "Windows PC", os: "Windows / Edge", ip: "72.184.201.18", location: "San Francisco, CA", started: "Dec 28, 2025", status: "terminated", duration: "0h 12m" },
]

// ─── Permissions ──────────────────────────────────────────────────────────────

export const permissions = {
  role: "Creator",
  features: [
    { category: "Content", items: [
      { name: "Publish Posts", granted: true },
      { name: "Upload Images", granted: true },
      { name: "Upload Videos", granted: true },
      { name: "Schedule Posts", granted: true },
      { name: "Access Drafts", granted: true },
      { name: "Create Polls", granted: true },
    ]},
    { category: "Communities", items: [
      { name: "Create Communities", granted: true },
      { name: "Moderate Communities", granted: true },
      { name: "Invite Members", granted: true },
    ]},
    { category: "Monetization", items: [
      { name: "Monetization Program", granted: true },
      { name: "Subscription Posts", granted: true },
      { name: "Tip Jar", granted: true },
      { name: "Merchandise Links", granted: false },
    ]},
    { category: "Premium", items: [
      { name: "Analytics Dashboard", granted: true },
      { name: "Verification Badge", granted: true },
      { name: "Priority Support", granted: true },
      { name: "Custom Badge (Beta)", granted: false },
    ]},
    { category: "Restrictions", items: [
      { name: "Account Restricted", granted: false },
      { name: "Content Restricted", granted: false },
      { name: "DM Restricted", granted: false },
      { name: "Comment Restricted", granted: false },
    ]},
  ],
}

// ─── Timeline ─────────────────────────────────────────────────────────────────

export const timelineEvents = [
  { id: 1, category: "moderation", title: "Report Dismissed", description: "Copyright claim from @photo_corp dismissed — original content verified", date: "Nov 15, 2025", admin: "mod_sarah" },
  { id: 2, category: "account", title: "Monetization Enabled", description: "Creator monetization program approved and activated", date: "Jun 1, 2025", admin: "system" },
  { id: 3, category: "account", title: "Premium Plan Upgraded", description: "Upgraded from Free to Pro plan", date: "Mar 12, 2025", admin: "system" },
  { id: 4, category: "verification", title: "Blue Verified Badge Granted", description: "Application approved after document verification — 48K followers", date: "Mar 14, 2023", admin: "mod_james" },
  { id: 5, category: "account", title: "Username Changed", description: "Changed from @alexrivera_photos to @photo_artist", date: "Jan 10, 2023", admin: "user" },
  { id: 6, category: "account", title: "Account Created", description: "New account registered via email", date: "Jan 15, 2023", admin: "system" },
]

// ─── Admin Notes & Case History ────────────────────────────────────────────────

export const adminNotes = [
  { id: 1, author: "mod_sarah", text: "Account in good standing. Verified creator with consistent, high-quality content. No history of violations.", date: "Jan 2, 2026" },
  { id: 2, author: "mod_james", text: "Processed verification application. All ID documents authentic. Public presence confirmed via multiple sources.", date: "Mar 14, 2023" },
]

export const caseHistory = [
  { id: "CASE-284", type: "Verification", summary: "Blue Verified badge application", status: "resolved", date: "Mar 14, 2023" },
  { id: "CASE-128", type: "Report", summary: "Copyright claim — dismissed", status: "closed", date: "Nov 15, 2025" },
]
