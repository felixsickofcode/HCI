"""Create personal vocabulary entries.

Revision ID: e7b03a9c6412
Revises: c4f1a7d92b10
"""
from alembic import op
import sqlalchemy as sa

revision = "e7b03a9c6412"
down_revision = "c4f1a7d92b10"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "vocabulary_entries",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("term", sa.String(120), nullable=False),
        sa.Column("normalized_term", sa.String(240), nullable=False),
        sa.Column("meaning", sa.Text(), nullable=True),
        sa.Column("example", sa.Text(), nullable=True),
        sa.Column("context_text", sa.Text(), nullable=False),
        sa.Column("source_document_id", sa.String(200), nullable=True),
        sa.Column("source_title", sa.String(300), nullable=True),
        sa.Column("source_kind", sa.String(10), nullable=True),
        sa.Column("content_version", sa.String(64), nullable=True),
        sa.Column("segment_id", sa.String(100), nullable=True),
        sa.Column("start", sa.Integer(), nullable=True),
        sa.Column("end", sa.Integer(), nullable=True),
        sa.Column("dedupe_key", sa.String(64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("user_id", "dedupe_key", name="uq_vocabulary_user_dedupe"),
    )
    op.create_index("ix_vocabulary_user_created", "vocabulary_entries", ["user_id", "created_at", "id"])


def downgrade() -> None:
    op.drop_index("ix_vocabulary_user_created", table_name="vocabulary_entries")
    op.drop_table("vocabulary_entries")
