# Epic 09 — Community

**Status:** Not Started
**Priority:** P1 — Important for retention and differentiation; largely independent
**Depends On:** Epic 02 (Auth)

## Goal
Users can post, engage, and connect with other vehicle enthusiasts. The community feed uses a trending algorithm to surface relevant content. Admins can seed content to solve the cold-start problem. Guest (non-logged-in) users can browse but not interact.

---

## Stories

### STORY-09-01: Create Post
**As a** logged-in user,
**I want** to create a post in the community feed,
**so that** I can share my experiences, tips, or questions with other enthusiasts.

**Acceptance Criteria:**
- [ ] "New post" CTA accessible from Community tab
- [ ] Fields:
  - Title (required)
  - Description (required; max 1,000 characters; live character counter shown)
  - Images (optional; max 2; JPG/PNG; max 5MB each; preview shown before submit)
  - Link (optional; URL field with basic validation)
  - Tags (optional; multi-select from predefined set + type-to-create custom tags)
- [ ] Predefined tags: Bikes, Cars, Mods, Travel, Maintenance, Fuel, Roads, Events, Help
- [ ] Custom tags: user types new tag text → "Create tag: [text]" option appears; custom tags stored and re-usable by creator
- [ ] Duplicate submission guard: same title + description from same user within 60 seconds → blocked silently; toast: "Your post was already submitted."
- [ ] On submit: post created; user redirected to post detail page

---

### STORY-09-02: Community Feed (Trending & Newest)
**As a** user,
**I want** to browse a feed of community posts,
**so that** I can discover interesting content from other enthusiasts.

**Acceptance Criteria:**
- [ ] Community tab shows feed of posts
- [ ] Default sort: **Trending** (Reddit hot score: `(likes - dislikes) / (age_hours + 2)^1.5`; recalculated on feed load)
- [ ] Sort toggle: **Trending** / **Newest** (by created_at desc)
- [ ] Each post card shows: title, author username + avatar, tags, like/dislike counts, comment count, time ago
- [ ] Post image thumbnail shown if images attached (first image)
- [ ] Auto-hidden posts (>= report threshold) not shown in feed
- [ ] Guest users (not logged in) can view feed and post details; interaction buttons (like, comment, post) prompt login
- [ ] Infinite scroll or "Load more" pagination

---

### STORY-09-03: Post Detail & Threaded Comments
**As a** user,
**I want** to read a full post and its comments,
**so that** I can follow the discussion and participate.

**Acceptance Criteria:**
- [ ] Post detail page: full title, description, images (full-size, swipeable), link, tags, author, timestamp
- [ ] Like / Dislike buttons with exact separate counts (e.g. 👍 24 👎 3); tapping toggles; logged-in only
- [ ] "Edited" label shown if post was edited; tooltip shows last edited timestamp
- [ ] Comment input at bottom (logged-in only); submit adds comment
- [ ] Comments displayed in threaded/nested format (Reddit-style): top-level + reply threads
- [ ] "Reply" on each comment opens inline reply input
- [ ] Comments sorted by: oldest first at top level; newest reply last within thread
- [ ] Comment count shown on post card in feed

---

### STORY-09-04: Edit Post
**As a** post author,
**I want** to edit my post after publishing,
**so that** I can fix mistakes or add information.

**Acceptance Criteria:**
- [ ] Edit accessible from post detail page kebab menu (own posts only)
- [ ] Pre-populated edit form with all current post data
- [ ] All fields editable (title, description, images, link, tags)
- [ ] On save: post updated; `edited = true`; edit timestamp + previous content saved to `edit_history` (JSON array)
- [ ] "Edited" label appears on post immediately after save
- [ ] No time limit on editing

---

### STORY-09-05: Report Post
**As a** user,
**I want** to report a post that violates community standards,
**so that** admins can review and take action.

**Acceptance Criteria:**
- [ ] Report option accessible from post detail page kebab menu (logged-in users; not own posts)
- [ ] Report form: reason dropdown (Spam / Inappropriate / Misinformation / Harassment / Other) + optional description field
- [ ] On submit: `PostReport` record created; toast: "Thanks for reporting. We'll review this post."
- [ ] User cannot report the same post twice (duplicate report blocked silently)
- [ ] If unique report count reaches admin-configured threshold (default 10): post `auto_hidden = true` (removed from feed; still accessible via direct link to admins)
- [ ] Auto-hidden post shows "This post has been hidden pending review." to users who navigate to it directly

---

### STORY-09-06: Delete Post and Comment
**As a** post/comment author,
**I want** to delete my own posts and comments,
**so that** I can remove content I no longer want visible.

**Acceptance Criteria:**
- [ ] Delete post: accessible from post detail kebab menu (own posts); confirmation dialog; on confirm, post + all comments + reactions deleted
- [ ] Delete comment: accessible from comment kebab menu (own comments); confirmation dialog; on confirm, comment deleted
- [ ] If deleted comment has replies: comment body replaced with "[deleted]" placeholder; thread structure preserved
- [ ] Deleted posts removed from feed immediately

---

### STORY-09-07: Tag Filtering & Search
**As a** user,
**I want** to filter the community feed by tag or search by keyword,
**so that** I can find posts relevant to my interests.

**Acceptance Criteria:**
- [ ] Tag filter: tapping a tag on any post filters feed to show only posts with that tag
- [ ] Active tag filter shown as chip above feed with "×" to clear
- [ ] Search bar in Community tab: searches post titles and descriptions (full-text search or ILIKE query)
- [ ] Search results displayed in same feed format; sorted by relevance then recency
- [ ] Empty state if no results: "No posts found for '[query]'"

---

### STORY-09-08: Guest (Unauthenticated) Community Access
**As a** visitor who hasn't signed up,
**I want** to browse the community feed without logging in,
**so that** I can see what MotoYaar is about before committing to sign up.

**Acceptance Criteria:**
- [ ] Community feed and post detail pages accessible without login
- [ ] Like, dislike, comment, and "New post" actions show login prompt when tapped by guest
- [ ] Login prompt: small modal with "Sign in with Google to join the conversation" + sign-in button
- [ ] No personal data shown to guests (other users' full profiles not exposed)
- [ ] Feed uses same trending algorithm for guests