-- ============================================================================
-- VERIFICACIÓN DE PROYECCIONES VS ÓRDENES REALES (USUARIO 1)
-- ============================================================================

-- 1. Ver el Snapshot actual almacenado
SELECT 
    userid, 
    lastorderid, 
    availablecash, 
    positions
FROM portfolio_snapshots 
WHERE userid = 1;


-- 2. Ver la secuencia de eventos (Órdenes FILLED ordenadas por id)
-- Esto permite hacer el seguimiento paso a paso del 'totalCost' (que es path-dependent)
SELECT 
    id AS order_id,
    datetime,
    instrumentid,
    type,
    side,
    size,
    price,
    (size * price) as total_value
FROM orders 
WHERE userid = 1 AND status = 'FILLED'
ORDER BY id ASC;


-- 3. Verificación de Caja Fuerte (Suma Independiente del Camino)
-- La caja disponible SIEMPRE tiene que ser la suma exacta de los depósitos/retiros 
-- y las compras/ventas, independientemente del orden.
SELECT 
    SUM(
        CASE 
            WHEN type = 'MARKET' AND side = 'CASH_IN' THEN (size * price)
            WHEN type = 'MARKET' AND side = 'CASH_OUT' THEN -(size * price)
            WHEN side = 'SELL' THEN (size * price)
            WHEN side = 'BUY' THEN -(size * price)
            ELSE 0
        END
    ) AS calculated_available_cash
FROM orders
WHERE userid = 1 AND status = 'FILLED';


-- 4. Verificación de Tenencias (Suma Independiente del Camino)
-- La cantidad de acciones (shares) SIEMPRE tiene que ser la suma exacta de compras - ventas.
SELECT 
    instrumentid,
    SUM(
        CASE 
            WHEN side = 'BUY' THEN size
            WHEN side = 'SELL' THEN -size
            ELSE 0
        END
    ) AS calculated_shares
FROM orders
WHERE userid = 1 
  AND status = 'FILLED' 
  AND type NOT IN ('CASH_IN', 'CASH_OUT')
GROUP BY instrumentid
ORDER BY instrumentid ASC;
