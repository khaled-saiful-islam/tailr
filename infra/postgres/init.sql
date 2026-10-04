-- Runs once, on the first start of an empty volume.
CREATE EXTENSION IF NOT EXISTS vector;
-- Tests get their own database, so `make test` never touches your data.
CREATE DATABASE tailr_test;
\connect tailr_test
CREATE EXTENSION IF NOT EXISTS vector;
