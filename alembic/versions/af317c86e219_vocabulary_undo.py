"""Retain the most recently removed word for undo."""
import sqlalchemy as sa
from alembic import op

revision = "af317c86e219"
down_revision = "e7b03a9c6412"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("vocabulary_entries", sa.Column("removed", sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade() -> None:
    op.execute("DELETE FROM vocabulary_entries WHERE removed")
    op.drop_column("vocabulary_entries", "removed")
