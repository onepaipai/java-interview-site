CREATE TABLE explanation_publications (
 question_id BIGINT PRIMARY KEY,
 pack_version VARCHAR(80) NOT NULL,
 answer_hash CHAR(64) NOT NULL,
 original_answer MEDIUMTEXT NOT NULL,
 original_version INT NOT NULL,
 applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(question_id) REFERENCES questions(id)
);
