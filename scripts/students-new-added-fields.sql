ALTER TABLE students
ADD COLUMN caste VARCHAR(20),
ADD COLUMN gender VARCHAR(20),
ADD COLUMN profile_completed BOOLEAN DEFAULT FALSE;

ALTER TABLE students
ADD CONSTRAINT students_caste_check
CHECK (caste IN ('ST', 'SC', 'OBC', 'GENERAL'));

ALTER TABLE students
ADD CONSTRAINT students_gender_check
CHECK (gender IN ('Male', 'Female', 'Transgender'));


ALTER TABLE students
ADD COLUMN emergency_contact_number VARCHAR(15),
ADD COLUMN date_of_birth DATE,

ADD COLUMN address_house VARCHAR(100),
ADD COLUMN address_block VARCHAR(100),
ADD COLUMN address_landmark VARCHAR(150),
ADD COLUMN address_area VARCHAR(150),
ADD COLUMN address_city VARCHAR(100),
ADD COLUMN address_state VARCHAR(100),
ADD COLUMN address_pincode VARCHAR(10);