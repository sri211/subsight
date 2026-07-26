from sqlalchemy import Column, String, Integer, Float, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from uuid import uuid4
from app.models.database import Base


class Job(Base):
    __tablename__ = "jobs"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    topic = Column(String, nullable=False)
    status = Column(String, default="pending")  # pending | running | complete | failed
    progress = Column(Integer, default=0)
    stage = Column(String, default="")
    error = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    summary_context = Column(Text, nullable=True)
    stats = Column(JSON, nullable=True)
    subreddits_found = Column(JSON, nullable=True)

    posts = relationship("Post", back_populates="job", cascade="all, delete-orphan")
    topics = relationship("Topic", back_populates="job", cascade="all, delete-orphan")
    personas = relationship("Persona", back_populates="job", cascade="all, delete-orphan")
    products = relationship("Product", back_populates="job", cascade="all, delete-orphan")
    pain_points = relationship("PainPoint", back_populates="job", cascade="all, delete-orphan")
    user_profiles = relationship("UserProfile", back_populates="job", cascade="all, delete-orphan")


class Post(Base):
    __tablename__ = "posts"

    id = Column(String, primary_key=True)
    job_id = Column(String, ForeignKey("jobs.id", ondelete="CASCADE"))
    subreddit = Column(String)
    title = Column(Text)
    body = Column(Text, default="")
    score = Column(Integer, default=0)
    num_comments = Column(Integer, default=0)
    author = Column(String, default="[deleted]")
    url = Column(String, default="")
    created_at = Column(DateTime, nullable=True)
    sentiment = Column(String, default="neutral")
    sentiment_score = Column(Float, default=0.0)
    topic_cluster = Column(String, nullable=True)
    keywords = Column(JSON, nullable=True)

    job = relationship("Job", back_populates="posts")
    comments = relationship("Comment", back_populates="post", cascade="all, delete-orphan")


class Comment(Base):
    __tablename__ = "comments"

    id = Column(String, primary_key=True)
    post_id = Column(String, ForeignKey("posts.id", ondelete="CASCADE"))
    job_id = Column(String)
    body = Column(Text)
    score = Column(Integer, default=0)
    author = Column(String, default="[deleted]")
    sentiment = Column(String, default="neutral")
    sentiment_score = Column(Float, default=0.0)

    post = relationship("Post", back_populates="comments")


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    job_id = Column(String, ForeignKey("jobs.id", ondelete="CASCADE"))
    username = Column(String)
    cross_subreddits = Column(JSON, default=dict)

    job = relationship("Job", back_populates="user_profiles")


class Topic(Base):
    __tablename__ = "topics"

    id = Column(Integer, primary_key=True, autoincrement=True)
    job_id = Column(String, ForeignKey("jobs.id", ondelete="CASCADE"))
    name = Column(String)
    size = Column(Integer, default=0)
    sentiment = Column(String, default="neutral")
    avg_sentiment_score = Column(Float, default=0.0)
    keywords = Column(JSON, default=list)
    monthly_counts = Column(JSON, default=dict)

    job = relationship("Job", back_populates="topics")


class Persona(Base):
    __tablename__ = "personas"

    id = Column(Integer, primary_key=True, autoincrement=True)
    job_id = Column(String, ForeignKey("jobs.id", ondelete="CASCADE"))
    name = Column(String)
    archetype = Column(String)
    demographics = Column(String, default="")
    pain_points = Column(JSON, default=list)
    goals = Column(JSON, default=list)
    quotes = Column(JSON, default=list)
    subreddits = Column(JSON, default=list)

    job = relationship("Job", back_populates="personas")


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, autoincrement=True)
    job_id = Column(String, ForeignKey("jobs.id", ondelete="CASCADE"))
    name = Column(String)
    mentions = Column(Integer, default=1)
    sentiment_score = Column(Float, default=0.0)
    sentiment_label = Column(String, default="MIXED")
    sample_quotes = Column(JSON, default=list)

    job = relationship("Job", back_populates="products")


class PainPoint(Base):
    __tablename__ = "pain_points"

    id = Column(Integer, primary_key=True, autoincrement=True)
    job_id = Column(String, ForeignKey("jobs.id", ondelete="CASCADE"))
    description = Column(Text)
    frequency = Column(Integer, default=1)
    quotes = Column(JSON, default=list)

    job = relationship("Job", back_populates="pain_points")
