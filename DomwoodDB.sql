CREATE DATABASE DomwoodDB;
USE DomwoodDB;
CREATE TABLE Admins (
    AdminID INT PRIMARY KEY IDENTITY(1,1),
    Username NVARCHAR(50) NOT NULL,
    Password NVARCHAR(100) NOT NULL  -- Store hashed passwords
);

-- Insert a test admin (password: "admin123")
INSERT INTO Admins (Username, Password) 
VALUES ('admin', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MrYV5Z6qS7J7f2QKQYHjzYF1tJQ5W6O'); -- bcrypt hash of "admin123"

