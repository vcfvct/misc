CREATE TABLE person (
  id INT,
  name varchar(32)
);
INSERT INTO person (id, name) VALUES (1, 'han');
INSERT INTO person (id, name) VALUES (2, 'sam');
INSERT INTO person (id, name) VALUES (3, 'sean');
INSERT INTO person (id, name) VALUES (4, 'james');

CREATE TABLE transaction (
  id INT,
  person_id INT,
  transaction_id INT,
  transaction_type INT,
  t_year INT
);

INSERT INTO transaction VALUES (10, 1, 100, 1, 2022);
INSERT INTO transaction VALUES (11, 1, 101, 2, 2022);
INSERT INTO transaction VALUES (12, 1, 102, 1, 2022);

INSERT INTO transaction VALUES (20, 2, 100, 1, 2022);
INSERT INTO transaction VALUES (21, 2, 101, 1, 2022);
INSERT INTO transaction VALUES (22, 2, 102, 2, 2022);

INSERT INTO transaction VALUES (30, 3, 300, 1, 2022);
INSERT INTO transaction VALUES (31, 3, 301, 1, 2022);
INSERT INTO transaction VALUES (32, 3, 302, 2, 2021);

INSERT INTO transaction VALUES (40, 4, 400, 1, 2022);
INSERT INTO transaction VALUES (41, 4, 401, 1, 2022);
INSERT INTO transaction VALUES (42, 4, 402, 3, 2022);

-- max transaction id items b person
SELECT p.name, max(t.transaction_id) FROM transaction t, person p
WHERE p.id = t.person_id AND t.t_year = 2022
GROUP BY t.person_id;

-- name with max transaction id
SELECT p.name, t.transaction_id FROM transaction t, person p
WHERE t.transaction_id IN (
  SELECT max(t.transaction_id) FROM transaction t
  WHERE  t.t_year = 2022 AND t.transaction_type IN (1, 2)
  GROUP BY t.person_id
) 
AND t.person_id = p.id
AND t.transaction_type = 1
