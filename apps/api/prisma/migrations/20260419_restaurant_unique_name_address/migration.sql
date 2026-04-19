-- 기존 (roomId, name, address) 중복 병합
-- 각 그룹에서 가장 오래된 레코드를 keeper로, 나머지의 visits/images를 keeper로 이관 후 중복 삭제

CREATE TEMPORARY TABLE tmp_restaurant_keepers AS
SELECT
  id,
  ROW_NUMBER() OVER (
    PARTITION BY roomId, name, address
    ORDER BY createdAt ASC, id ASC
  ) AS rn,
  FIRST_VALUE(id) OVER (
    PARTITION BY roomId, name, address
    ORDER BY createdAt ASC, id ASC
  ) AS keeper_id
FROM RoomRestaurant;

-- keeper의 isWishlist를 FALSE로 설정 (중복 중 하나라도 실제 등록된 식당이면 방문 이력 있으므로)
UPDATE RoomRestaurant r
  JOIN tmp_restaurant_keepers t ON r.id = t.keeper_id
  SET r.isWishlist = FALSE
  WHERE EXISTS (
    SELECT 1 FROM RoomRestaurant r2
      JOIN tmp_restaurant_keepers t2 ON r2.id = t2.id
     WHERE t2.keeper_id = t.keeper_id AND r2.isWishlist = FALSE
  );

-- 중복 행(rn > 1)의 방문 기록을 keeper로 이관
UPDATE RoomVisit v
  JOIN tmp_restaurant_keepers t ON v.restaurantId = t.id
  SET v.restaurantId = t.keeper_id
  WHERE t.rn > 1;

-- 중복 행의 이미지를 keeper로 이관
UPDATE RoomRestaurantImage i
  JOIN tmp_restaurant_keepers t ON i.restaurantId = t.id
  SET i.restaurantId = t.keeper_id
  WHERE t.rn > 1;

-- 중복 행 삭제 (keeper만 남음)
DELETE r FROM RoomRestaurant r
  JOIN tmp_restaurant_keepers t ON r.id = t.id
  WHERE t.rn > 1;

DROP TEMPORARY TABLE tmp_restaurant_keepers;

-- UNIQUE INDEX 추가
CREATE UNIQUE INDEX `RoomRestaurant_roomId_name_address_key` ON `RoomRestaurant`(`roomId`, `name`, `address`);
