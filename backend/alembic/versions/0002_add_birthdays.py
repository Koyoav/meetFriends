"""add birth month/day to people

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-02

"""
from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("people", sa.Column("birth_month", sa.Integer, nullable=True))
    op.add_column("people", sa.Column("birth_day", sa.Integer, nullable=True))


def downgrade() -> None:
    op.drop_column("people", "birth_day")
    op.drop_column("people", "birth_month")
