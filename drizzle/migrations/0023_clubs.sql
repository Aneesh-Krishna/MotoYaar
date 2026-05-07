CREATE TABLE clubs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL UNIQUE,
  city          TEXT NOT NULL,
  description   TEXT,
  logo_url      TEXT,
  invite_code   TEXT NOT NULL UNIQUE,
  join_policy   TEXT NOT NULL DEFAULT 'approval'
                  CONSTRAINT clubs_join_policy_check CHECK (join_policy IN ('approval', 'open')),
  created_by    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE club_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id     UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'member' CONSTRAINT club_members_role_check CHECK (role IN ('admin', 'member')),
  status      TEXT NOT NULL DEFAULT 'active' CONSTRAINT club_members_status_check CHECK (status IN ('active', 'pending', 'removed')),
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT club_members_club_id_user_id_unique UNIQUE (club_id, user_id)
);

CREATE INDEX idx_clubs_city ON clubs(city);
CREATE INDEX idx_club_members_club_id ON club_members(club_id);
CREATE INDEX idx_club_members_user_id ON club_members(user_id);
