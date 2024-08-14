const inquirer = require('inquirer');
const { Pool } = require('pg');
const { consoleTable } = require('js-awe');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: 'localhost',
    database: process.env.DB_NAME
}, console.log('You are connected to the employees_db database'));

pool.connect();

// Function to fetch department names
const fetchDepartmentList = async () => {
    try {
        const { rows } = await pool.query('SELECT * FROM department');
        return rows;
    } catch (err) {
        console.error('Error fetching department names:', err);
        throw err;
    }
};

// Function to fetch roles and employees
const fetchRolesAndEmployees = async () => {
    try {
        const { rows } = await pool.query(`SELECT role.id AS role_id, role.title, role.salary, role.department_id, 
                                            employee.id AS employee_id, employee.first_name, employee.last_name, 
                                            employee.role_id AS employee_role_id, employee.manager_id 
                                            FROM role 
                                            LEFT JOIN employee ON role.id = employee.role_id`);
        return rows;
    } catch (err) {
        console.error('Error fetching roles and employees:', err);
        throw err;
    }
};

// Function to prompt user for action
const promptUser = async () => {
    try {
        const deptList = await fetchDepartmentList();
        const rolesData = await fetchRolesAndEmployees();
        const employeesData = rolesData.filter(emp => emp.employee_id !== null); // Ensure employeesData is initialized

        const uniqueRoles = [...new Set(rolesData.map(role => ({ name: role.title, value: role.role_id })))];
        const managers = rolesData.filter(emp => emp.role_id === 6);
        const managerChoices = [{ name: 'None', value: null }, ...managers.map(manager => ({ name: `${manager.first_name} ${manager.last_name}`, value: manager.employee_id }))];

        const { start } = await inquirer.prompt([
            {
                type: 'list',
                name: 'start',
                message: 'What would you like to do?',
                choices: [
                    'View All Departments', 'View All Roles', 'View All Employees', 
                    'Add Department', 'Add Role', 'Add Employee', 'Update Employee Role', 
                    'Update Employee Manager', 'View Employees by Manager', 
                    'View Employees by Department', 'Delete Department', 'Delete Role', 
                    'Delete Employee', 'View Total Utilized Budget of Department'
                ],
            },
        ]);

        switch (start) {
            case 'View All Departments':
                const departments = await fetchDepartmentList();
                consoleTable(departments);
                break;

            case 'View All Roles':
                const roles = await fetchRolesAndEmployees();
                const formattedRoles = roles.map(role => ({
                    id: role.role_id,
                    title: role.title,
                    department: role.department_id,
                    salary: role.salary
                }));
                consoleTable(formattedRoles);
                break;

            case 'View All Employees':
                const employees = await pool.query(`SELECT employee.id, employee.first_name, employee.last_name, 
                                                     role.title, department.name AS department, role.salary, 
                                                     CONCAT(m.first_name, ' ', m.last_name) AS manager
                                                     FROM employee
                                                     JOIN role ON employee.role_id = role.id
                                                     JOIN department ON department.id = role.department_id
                                                     LEFT JOIN employee m ON employee.manager_id = m.id`);
                consoleTable(employees.rows);
                break;

            case 'Add Department':
                const { department } = await inquirer.prompt([
                    {
                        type: 'input',
                        name: 'department',
                        message: 'What is the name of the department?',
                    },
                ]);
                await pool.query('INSERT INTO department(name) VALUES($1)', [department]);
                console.log(`Added ${department} to the database`);
                break;

            case 'Add Role':
                const departmentChoices = deptList.map(dept => ({ name: dept.name, value: dept.id }));

                const { role, roleSalary, roleDepartment } = await inquirer.prompt([
                    { type: 'input', name: 'role', message: 'What is the name of the role?' },
                    { type: 'input', name: 'roleSalary', message: 'What is the salary of the role?' },
                    { type: 'list', name: 'roleDepartment', message: 'Which department does the role belong to?', choices: departmentChoices }
                ]);
                await pool.query('INSERT INTO role(title, salary, department_id) VALUES($1, $2, $3)', [role, roleSalary, roleDepartment]);
                console.log(`Added ${role} to the database`);
                break;

            case 'Add Employee':
                const uniqueRoleChoices = uniqueRoles;
                const managerChoicesForAddEmployee = [{ name: 'None', value: null }, ...managers.map(manager => ({ name: `${manager.first_name} ${manager.last_name}`, value: manager.employee_id }))];

                const { firstName, lastName, employeeRole, employeeManager } = await inquirer.prompt([
                    { type: 'input', name: 'firstName', message: 'What is the employee\'s first name?' },
                    { type: 'input', name: 'lastName', message: 'What is the employee\'s last name?' },
                    { type: 'list', name: 'employeeRole', message: 'What is the employee\'s role?', choices: uniqueRoleChoices },
                    { type: 'list', name: 'employeeManager', message: 'Who is the employee\'s manager?', choices: managerChoicesForAddEmployee }
                ]);
                await pool.query('INSERT INTO employee(first_name, last_name, role_id, manager_id) VALUES($1, $2, $3, $4)', [firstName, lastName, employeeRole, employeeManager]);
                console.log(`Added ${firstName} ${lastName} to the database`);
                break;

            case 'Update Employee Role':
                const employeeChoices = employeesData.map(emp => ({ name: `${emp.first_name} ${emp.last_name}`, value: emp.employee_id }));

                const { employeeSelect, employeeUpdatedRole } = await inquirer.prompt([
                    { type: 'list', name: 'employeeSelect', message: 'Which employee\'s role do you want to update?', choices: employeeChoices },
                    { type: 'list', name: 'employeeUpdatedRole', message: 'Which role do you want to assign to the selected employee?', choices: uniqueRoles }
                ]);
                await pool.query('UPDATE employee SET role_id = $1 WHERE id = $2', [employeeUpdatedRole, employeeSelect]);
                console.log('Updated employee\'s role');
                break;

            case 'Update Employee Manager':
                const employeeChoicesForManager = employeesData.map(emp => ({ name: `${emp.first_name} ${emp.last_name}`, value: emp.employee_id }));
                const managerChoicesForUpdate = [{ name: 'None', value: null }, ...managers.map(manager => ({ name: `${manager.first_name} ${manager.last_name}`, value: manager.employee_id }))];

                const { employeeSelectForManager, employeeUpdatedManager } = await inquirer.prompt([
                    { type: 'list', name: 'employeeSelectForManager', message: 'Which employee\'s manager do you want to update?', choices: employeeChoicesForManager },
                    { type: 'list', name: 'employeeUpdatedManager', message: 'Which manager do you want to assign to the selected employee?', choices: managerChoicesForUpdate }
                ]);
                await pool.query('UPDATE employee SET manager_id = $1 WHERE id = $2', [employeeUpdatedManager, employeeSelectForManager]);
                console.log('Updated employee\'s manager');
                break;

            case 'View Employees by Manager':
                const { managerId } = await inquirer.prompt({
                    type: 'list',
                    name: 'managerId',
                    message: 'Select the manager to view their employees:',
                    choices: managerChoices
                });

                const employeesByManager = await pool.query(`SELECT employee.id, employee.first_name, employee.last_name, 
                                                             role.title, department.name AS department, role.salary, 
                                                             CONCAT(m.first_name, ' ', m.last_name) AS manager
                                                             FROM employee
                                                             JOIN role ON employee.role_id = role.id
                                                             JOIN department ON department.id = role.department_id
                                                             LEFT JOIN employee m ON employee.manager_id = m.id
                                                             WHERE employee.manager_id = $1`, [managerId]);

                const selectedManager = managers.find(manager => manager.employee_id === managerId);
                console.log(`Viewing employees managed by ${selectedManager ? `${selectedManager.first_name} ${selectedManager.last_name}` : 'None'}`);
                consoleTable(employeesByManager.rows);
                break;

            case 'View Employees by Department':
                const departmentChoicesForEmployees = deptList.map(dept => ({ name: dept.name, value: dept.id }));

                const { departmentIdForEmployees } = await inquirer.prompt({
                    type: 'list',
                    name: 'departmentIdForEmployees',
                    message: 'Select the department to view its employees:',
                    choices: departmentChoicesForEmployees
                });

                const employeesByDepartment = await pool.query(`SELECT employee.id, employee.first_name, employee.last_name, 
                                                                role.title, department.name AS department, role.salary, 
                                                                CONCAT(m.first_name, ' ', m.last_name) AS manager
                                                                FROM employee
                                                                JOIN role ON employee.role_id = role.id
                                                                JOIN department ON department.id = role.department_id
                                                                LEFT JOIN employee m ON employee.manager_id = m.id
                                                                WHERE department.id = $1`, [departmentIdForEmployees]);

                const selectedDepartment = deptList.find(dept => dept.id === departmentIdForEmployees);
                console.log(`Viewing employees in the ${selectedDepartment ? selectedDepartment.name : 'Unknown'} department`);
                consoleTable(employeesByDepartment.rows);
                break;

            case 'Delete Department':
                const departmentChoicesToDelete = deptList.map(dept => ({ name: dept.name, value: dept.id }));

                const { departmentToDelete } = await inquirer.prompt({
                    type: 'list',
                    name: 'departmentToDelete',
                    message: 'Select the department to delete:',
                    choices: departmentChoicesToDelete
                });

                await pool.query('DELETE FROM department WHERE id = $1', [departmentToDelete]);
                console.log('Department deleted successfully.');
                break;

            case 'Delete Role':
                const roleChoicesToDelete = [...new Set(rolesData.map(role => ({
                    name: role.title,
                    value: role.role_id
                })))];

                const { roleToDelete } = await inquirer.prompt({
                    type: 'list',
                    name: 'roleToDelete',
                    message: 'Select the role to delete:',
                    choices: roleChoicesToDelete
                });

                await pool.query('DELETE FROM role WHERE id = $1', [roleToDelete]);
                console.log('Role deleted successfully.');
                break;

            case 'Delete Employee':
                const employeeChoicesToDelete = employeesData.map(employee => ({ name: `${employee.first_name} ${employee.last_name}`, value: employee.employee_id }));

                const { employeeToDelete } = await inquirer.prompt({
                    type: 'list',
                    name: 'employeeToDelete',
                    message: 'Select the employee to delete:',
                    choices: employeeChoicesToDelete
                });

                await pool.query('DELETE FROM employee WHERE id = $1', [employeeToDelete]);
                console.log('Employee deleted successfully.');
                break;

            case 'View Total Utilized Budget of Department':
                const departmentChoicesForBudget = deptList.map(dept => ({ name: dept.name, value: dept.id }));

                const { departmentForBudget } = await inquirer.prompt({
                    type: 'list',
                    name: 'departmentForBudget',
                    message: 'Select the department to view its budget:',
                    choices: departmentChoicesForBudget
                });

                const budgetQuery = `SELECT department.id, department.name AS department, 
                                     SUM(role.salary) AS totalUtilizedBudget
                                     FROM department
                                     JOIN role ON department.id = role.department_id
                                     WHERE department.id = $1
                                     GROUP BY department.id`;

                const { rows } = await pool.query(budgetQuery, [departmentForBudget]);
                consoleTable(rows);
                break;

            default:
                console.log('Invalid option.');
                break;
        }

        promptUser(); // Recursive call to prompt the user again
    } catch (err) {
        console.error('Error during user prompt:', err);
    }
};


module.exports = { promptUser };

