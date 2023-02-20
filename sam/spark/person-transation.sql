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

INSERT INTO transaction VALUES (30, 3, 100, 1, 2022);
INSERT INTO transaction VALUES (31, 3, 101, 1, 2022);
INSERT INTO transaction VALUES (32, 3, 102, 2, 2021);

INSERT INTO transaction VALUES (40, 4, 100, 1, 2022);
INSERT INTO transaction VALUES (41, 4, 101, 1, 2022);
INSERT INTO transaction VALUES (42, 4, 102, 3, 2022);

-- max transaction id items b person
SELECT p.name, max(t.transaction_id) FROM transaction t, person p
WHERE p.id = t.person_id AND t.t_year = 2022
GROUP BY t.person_id;

---- https://www.db-fiddle.com/f/meVtvx7z9dPjxiiiLcrCE5/4
----------- OPTION 1: use correlated subquery
SELECT p1.name, t1.transaction_id
FROM person p1,transaction t1
WHERE t1.person_id = p1.id 
AND t1.transaction_type = 1
AND t1.transaction_id = (SELECT max(t2.transaction_id) 
 FROM transaction t2
 WHERE t2.t_year = 2022 AND t1.person_id = t2.person_id AND t2.transaction_type IN (1, 2))
  
----------- OPTION 2: use uncorrelated subquery
SELECT p1.name, t1.transaction_id
FROM person p1, transaction t1
JOIN (   SELECT max(t.transaction_id) as max_id, person_id
  FROM transaction t
  WHERE  t.t_year = 2022 AND t.transaction_type IN (1, 2)
  GROUP BY t.person_id) AS tmp
ON t1.person_id = tmp.person_id AND t1.transaction_id = tmp.max_id
WHERE t1.transaction_type = 1 AND t1.person_id = p1.id

----------- name with max transaction id, this does not work with dupplicated transaction_id
SELECT p.name, t.transaction_id FROM transaction t, person p
WHERE t.transaction_id IN (
  SELECT max(t.transaction_id) FROM transaction t
  WHERE  t.t_year = 2022 AND t.transaction_type IN (1, 2)
  GROUP BY t.person_id
) 
AND t.person_id = p.id
AND t.transaction_type = 1
