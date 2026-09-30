\echo
SELECT CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END AS r, name, left(detail,90) AS detalle FROM results ORDER BY 2;
SELECT count(*) FILTER (WHERE NOT ok) AS fallos, count(*) AS total, (count(*) FILTER (WHERE NOT ok)) > 0 AS hay FROM results \gset
\echo Total :total  Fallos :fallos
\if :hay
  \echo >>> HAY FALLOS
  \quit 1
\endif
