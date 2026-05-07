ALTER TABLE posts ADD COLUMN club_id UUID REFERENCES clubs(id) ON DELETE CASCADE;

CREATE INDEX idx_posts_club_id ON posts(club_id) WHERE club_id IS NOT NULL;
