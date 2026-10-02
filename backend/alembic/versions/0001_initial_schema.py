"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-10-02

"""
from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "households",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )

    op.create_table(
        "users",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("household_id", sa.Integer, sa.ForeignKey("households.id"), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "friends",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("household_id", sa.Integer, sa.ForeignKey("households.id"), nullable=False),
        sa.Column("display_name", sa.String(255), nullable=False),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("kids_fit_score", sa.Integer, nullable=True),
        sa.Column("adult_fit_score", sa.Integer, nullable=False),
        sa.Column("importance_score", sa.Integer, nullable=False),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )

    op.create_table(
        "people",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("friend_id", sa.Integer, sa.ForeignKey("friends.id"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("role", sa.Enum("ADULT", "KID", name="personrole"), nullable=False),
        sa.Column("birth_year", sa.Integer, nullable=True),
    )

    op.create_table(
        "friend_gathering_types",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("friend_id", sa.Integer, sa.ForeignKey("friends.id"), nullable=False),
        sa.Column(
            "type",
            sa.Enum(
                "FAMILY", "MEN_1_1", "WOMEN_1_1", "KIDS_ONLY", "CUSTOM", name="gatheringtypelabel"
            ),
            nullable=False,
        ),
        sa.Column("custom_label", sa.String(255), nullable=True),
        sa.Column("reminder_threshold_days", sa.Integer, nullable=False, server_default="60"),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )

    op.create_table(
        "gatherings",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("friend_id", sa.Integer, sa.ForeignKey("friends.id"), nullable=False),
        sa.Column(
            "gathering_type_id",
            sa.Integer,
            sa.ForeignKey("friend_gathering_types.id"),
            nullable=False,
        ),
        sa.Column("date", sa.Date, nullable=False),
        sa.Column(
            "location",
            sa.Enum("OUR_PLACE", "THEIR_PLACE", "OUTSIDE", name="gatheringlocation"),
            nullable=False,
        ),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_by", sa.Integer, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )


def downgrade() -> None:
    op.drop_table("gatherings")
    op.drop_table("friend_gathering_types")
    op.drop_table("people")
    op.drop_table("friends")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
    op.drop_table("households")
