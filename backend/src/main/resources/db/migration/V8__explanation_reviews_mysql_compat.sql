-- V7 的 CLOB 在 H2 可用，但 MySQL 8.4 没有该列类型别名；统一为项目其它迁移使用的 MEDIUMTEXT。
ALTER TABLE explanation_reviews MODIFY evidence MEDIUMTEXT NOT NULL;
