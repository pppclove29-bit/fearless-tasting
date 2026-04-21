-- RoomRestaurant.address VARCHAR(500) → VARCHAR(300)
-- 사유: (roomId, name, address) 복합 유니크 인덱스가 TiDB 3072 바이트 키 한도 초과.
-- 191*4 + 200*4 + 500*4 = 3564 > 3072. address를 300으로 줄여 2764 bytes로 축소.
-- 기존 데이터 중 길이 > 300인 경우 앞 300자로 절단 (실사용 address는 100자 이하이므로 영향 없음).

UPDATE `RoomRestaurant` SET `address` = LEFT(`address`, 300) WHERE CHAR_LENGTH(`address`) > 300;

ALTER TABLE `RoomRestaurant` MODIFY `address` VARCHAR(300) NOT NULL;
