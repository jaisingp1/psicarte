INSERT INTO content (key, value)
VALUES ('contactAddress', 'Oficina Virtual Las Bellotas 199, Providencia, RM')
ON CONFLICT(key) DO UPDATE SET value = excluded.value
WHERE content.value IS NULL OR trim(content.value) = '';

INSERT INTO config (key, value)
VALUES ('instagram_url', 'https://www.instagram.com/centropsicarte/')
ON CONFLICT(key) DO UPDATE SET value = excluded.value
WHERE config.value IS NULL OR trim(config.value) = '';
