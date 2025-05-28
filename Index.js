import inquirer from 'inquirer';
import pool from './db/connection.js';
import consoleTable from 'console.table';

const startApp = async () => {
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        'View All Departments',
        'View All Roles',
        'View All Employees',
        'Add Department',
        'Add Role',
        'Add Employee',
        'Update Employee Role',
        'Exit'
      ]
    }
  ]);

  switch (action) {
    case 'View All Departments':
      const departments = await pool.query('SELECT * FROM department');
      console.table(departments.rows);
      break;

    case 'View All Roles':
      const roles = await pool.query(`
        SELECT role.id, role.title, department.name AS department, role.salary 
        FROM role
        JOIN department ON role.department_id = department.id
      `);
      console.table(roles.rows);
      break;

    case 'View All Employees':
      const employees = await pool.query(`
        SELECT 
          e.id, e.first_name, e.last_name, 
          role.title AS role, 
          department.name AS department, 
          role.salary,
          CONCAT(m.first_name, ' ', m.last_name) AS manager
        FROM employee e
        JOIN role ON e.role_id = role.id
        JOIN department ON role.department_id = department.id
        LEFT JOIN employee m ON e.manager_id = m.id
      `);
      console.table(employees.rows);
      break;

    case 'Add Department':
      const { deptName } = await inquirer.prompt({
        type: 'input',
        name: 'deptName',
        message: 'Enter the name of the department:',
      });
      await pool.query('INSERT INTO department (name) VALUES ($1)', [deptName]);
      console.log(`✅ Department "${deptName}" added!`);
      break;

    case 'Add Role':
      const depts = await pool.query('SELECT * FROM department');
      const { title, salary, deptId } = await inquirer.prompt([
        { type: 'input', name: 'title', message: 'Role title:' },
        { type: 'input', name: 'salary', message: 'Role salary:' },
        {
          type: 'list',
          name: 'deptId',
          message: 'Select department:',
          choices: depts.rows.map((d) => ({ name: d.name, value: d.id })),
        }
      ]);
      await pool.query(
        'INSERT INTO role (title, salary, department_id) VALUES ($1, $2, $3)',
        [title, salary, deptId]
      );
      console.log(`✅ Role "${title}" added!`);
      break;

    case 'Add Employee':
      const rolesList = await pool.query('SELECT * FROM role');
      const employeesList = await pool.query('SELECT * FROM employee');
      const { firstName, lastName, roleId, managerId } = await inquirer.prompt([
        { type: 'input', name: 'firstName', message: 'First name:' },
        { type: 'input', name: 'lastName', message: 'Last name:' },
        {
          type: 'list',
          name: 'roleId',
          message: 'Select role:',
          choices: rolesList.rows.map((r) => ({ name: r.title, value: r.id })),
        },
        {
          type: 'list',
          name: 'managerId',
          message: 'Select manager:',
          choices: [
            { name: 'None', value: null },
            ...employeesList.rows.map((e) => ({
              name: `${e.first_name} ${e.last_name}`,
              value: e.id,
            })),
          ]
        }
      ]);
      await pool.query(
        'INSERT INTO employee (first_name, last_name, role_id, manager_id) VALUES ($1, $2, $3, $4)',
        [firstName, lastName, roleId, managerId]
      );
      console.log(`✅ Employee "${firstName} ${lastName}" added!`);
      break;

    case 'Update Employee Role':
      const emps = await pool.query('SELECT * FROM employee');
      const rolesAll = await pool.query('SELECT * FROM role');
      const { empId, newRoleId } = await inquirer.prompt([
        {
          type: 'list',
          name: 'empId',
          message: 'Choose employee to update:',
          choices: emps.rows.map((e) => ({
            name: `${e.first_name} ${e.last_name}`,
            value: e.id
          }))
        },
        {
          type: 'list',
          name: 'newRoleId',
          message: 'Select new role:',
          choices: rolesAll.rows.map((r) => ({
            name: r.title,
            value: r.id
          }))
        }
      ]);
      await pool.query('UPDATE employee SET role_id = $1 WHERE id = $2', [newRoleId, empId]);
      console.log(`✅ Employee role updated!`);
      break;

    case 'Exit':
      console.log("👋 Exiting the Employee Manager...");
      process.exit();
  }

  startApp(); // restart loop
};

startApp();
