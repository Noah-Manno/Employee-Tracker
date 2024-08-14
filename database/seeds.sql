INSERT INTO department (name)
    VALUES 
        ('Music'),
        ('Art'),
        ('Theater'),
        ('Dance');

INSERT INTO role (title, salary, department_id)
    VALUES
        ('Teacher', 45000, 1),
        ('Supervisor', 35000, 1),
        ('Manager', 35000, 1);

INSERT INTO employee (first_name, last_name, role_id, manager_id)
    VALUES
        ('Noah', 'Manno', 1, 1),
        ('Grace', 'Jones', 2, 1),
        ('Big', 'Boss', 3, NULL);