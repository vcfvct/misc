CREATE TABLE person (
  id INT,
  name varchar(32),
  city varchar(32),
  state varchar(32)
);
INSERT INTO person VALUES (1, 'han', 'germantown', 'md');
INSERT INTO person VALUES (2, 'sam', 'potomac', 'md');
INSERT INTO person VALUES (3, 'sean', 'vienna', 'va');
INSERT INTO person VALUES (4, 'james', 'rockville', 'md');

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
--  INSERT INTO transaction VALUES (13, 1, 203, 1, 2022);

INSERT INTO transaction VALUES (20, 2, 100, 1, 2022);
INSERT INTO transaction VALUES (21, 2, 101, 1, 2022);
INSERT INTO transaction VALUES (22, 2, 102, 2, 2022);
--  INSERT INTO transaction VALUES (23, 2, 203, 1, 2022);

INSERT INTO transaction VALUES (30, 3, 100, 1, 2022);
INSERT INTO transaction VALUES (31, 3, 101, 1, 2022);
INSERT INTO transaction VALUES (32, 3, 102, 2, 2021);
--  INSERT INTO transaction VALUES (33, 3, 203, 1, 2022);

INSERT INTO transaction VALUES (40, 4, 100, 1, 2022);
INSERT INTO transaction VALUES (41, 4, 101, 1, 2022);
INSERT INTO transaction VALUES (42, 4, 102, 3, 2022);
--  INSERT INTO transaction VALUES (43, 4, 203, 1, 2022);

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
SELECT t1.transaction_id, tmp.name, tmp.city, tmp.state
FROM  transaction t1
JOIN (   SELECT max(t.transaction_id) as max_id, t.person_id, p.city, p.state, p.name
 FROM transaction t, person p
 WHERE  t.t_year = 2022 AND t.transaction_type IN (1, 2) AND p.id = t.person_id
 GROUP BY t.person_id, p.city, p.state, p.name) AS tmp
ON t1.person_id = tmp.person_id AND t1.transaction_id = tmp.max_id
WHERE t1.transaction_type = 1 


----------- OPTION 3: use Having clause to ensure that the maximum transaction id is not a transaction type 2 that is preceded by a transaction type 1.
--  SELECT p.name, t.city, t.state, t.max_transaction
--  FROM person p
--  JOIN (
  --  SELECT person_id, city, state, MAX(transaction_id) AS max_transaction
  --  FROM transaction
  --  WHERE transaction_type IN (1, 2) AND t_year = 2022
  --  GROUP BY person_id, city, state
  --  HAVING 
    --  -- max transaction type 1 is not preceded by a transaction type 2
    --  MAX(CASE WHEN transaction_type = 2 THEN transaction_id ELSE 0 END) < MAX(CASE WHEN transaction_type = 1 THEN transaction_id ELSE 0 END) 
--  )t ON p.id = t.person_id

----------- name with max transaction id, this does not work with dupplicated transaction_id
SELECT p.name, t.transaction_id FROM transaction t, person p
WHERE t.transaction_id IN (
  SELECT max(t.transaction_id) FROM transaction t
  WHERE  t.t_year = 2022 AND t.transaction_type IN (1, 2)
  GROUP BY t.person_id
) 
AND t.person_id = p.id
AND t.transaction_type = 1
