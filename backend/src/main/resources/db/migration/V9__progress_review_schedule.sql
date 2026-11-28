-- 间隔复习排期：自评后由 Java 层计算下次到期时间写入，NULL 表示未排期（视为立即到期）。
ALTER TABLE progress ADD COLUMN next_review TIMESTAMP NULL;
