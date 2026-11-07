CREATE TABLE explanation_pack_state (
 id INT PRIMARY KEY,
 pack_version VARCHAR(80) NOT NULL
);
INSERT INTO explanation_pack_state(id,pack_version) VALUES(1,'explanations-v1');
