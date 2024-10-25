import sympy as sp
from flask import Flask, request, jsonify
from flask_cors import CORS  # Import CORS
from sympy import symbols, Eq, simplify
from sympy.parsing.latex import parse_latex

app = Flask(__name__)
CORS(app)  # Enable CORS for the entire application

@app.route('/calculate-kkt', methods=['POST'])
def calculate_kkt():
    # Get the JSON data from the request
    data = request.get_json()

    # Extract different parts of the data
    objective_function = data.get('objectiveFunction', {})
    constraints = data.get('constraints', [])
    objective_variables = data.get('objectiveVariables', '')

    # Log received data for debugging
    print("Received Objective Function:", objective_function)
    print("Received Constraints:", constraints)
    print("Received Objective Variables:", objective_variables)

    # Parse the objective function and variables using sympy
    variables = [sp.Symbol(var.strip()) for var in objective_variables.split(',')]
    #objective_expr = sp.sympify(objective_function['function'])
    objective_expr = parse_latex(objective_function['function'])

    print(objective_expr)

    #Calculate constraints conditions (turns them all into <= 0)
    constraints_expr, constraints_expr_string = calculate_constraints(constraints)

    #Setup lagrange function and find complementary slackness conditions
    lagrange_function, complementary_slackness_conditions = setup_lagrange_function(objective_expr, constraints_expr)

    #Find partial derivatives conditions
    partial_derivative_conditions = find_partial_derivatives(lagrange_function, variables)

    #Convert all results into latex
    constraints_expr_string_latex = convert_sympy_to_latex(constraints_expr_string, variables)
    complementary_slackness_conditions_latex = convert_sympy_to_latex(complementary_slackness_conditions, variables)
    partial_derivative_conditions_latex = convert_sympy_to_latex(partial_derivative_conditions, variables)

    print(f"HEEEEEEEEEEER {lagrange_function}")
    print(f"HEEEEEEEEEEER {sp.latex(lagrange_function)}")
    lagrange_function_latex = sp.latex(lagrange_function)

    '''print(lagrange_function)
    print(complementary_slackness_conditions)

    print(variables)
    print(objective_expr)
    print(constraints_expr)
    print(constraints_expr_string)
    print(constraints)
    print(partial_derivative_conditions)
    print(f"HEEER {convert_to_latex(constraints_expr_string)}")'''

    # Prepare Result
    result = {
        "objectiveGradient": [partial_derivative_conditions_latex],
        "lagrangeGradient": [constraints_expr_string_latex],
        "complementarySlackness": [complementary_slackness_conditions_latex],
        "lagrangeFunction": [lagrange_function_latex]
    }
    print(result)

    return jsonify(result)

def calculate_constraints(constraints):
    # Two lists to store transformed constraints
    transformed_expressions = []  # Pure math expressions
    transformed_strings = []      # String representation with " <= 0"

    python_constraints = constraints
    #Parse alle functions og values til python matematik
    for constraint in python_constraints:
        try:
            # Brug parse_latex til at konvertere LaTeX strenge for 'function' og 'value'
            constraint['function'] = parse_latex(constraint['function'])
            constraint['value'] = parse_latex(constraint['value'])
        except Exception as e:
            print(f"Fejl ved parsing af LaTeX: {e}")

    # Iterate over each constraint to parse and transform
    for constraint in python_constraints:
        function_str = constraint['function']
        value_str = constraint['value']
        constraint_type = constraint['type']
        # Convert function and value to sympy expressions
        try:
            function_expr = sp.sympify(function_str)
            value_expr = sp.sympify(value_str)
        except sp.SympifyError:
            print(f"Error: Could not convert {function_str} or {value_str} into a sympy expression.")
            continue  # Skip this constraint if it couldn't be parsed

        # Transform the constraint based on type
        if constraint_type == 'geq':
            # Move everything to LHS and multiply by -1 to make it <= 0
            function_expr = function_expr *(-1)
            value_expr = value_expr *(-1)
            if value_expr >= 0:
                transformed_expr = simplify(function_expr - value_expr)
            else:
                transformed_expr = simplify(function_expr + abs(value_expr))
            transformed_expressions.append(transformed_expr)
            transformed_strings.append(f"{transformed_expr} <= 0")

        elif constraint_type == 'leq':
            # Move everything to LHS by checking the sign of value_expr
            if value_expr >= 0:
                transformed_expr = simplify(function_expr - value_expr)
            else:
                transformed_expr = simplify(function_expr + abs(value_expr))
            transformed_expressions.append(transformed_expr)
            transformed_strings.append(f"{transformed_expr} <= 0")

        elif constraint_type == 'eq':
            # Move everything to LHS by checking the sign of value_expr
            if value_expr >= 0:
                transformed_expr = simplify(function_expr - value_expr)
            else:
                transformed_expr = simplify(function_expr + abs(value_expr))
            transformed_expressions.append(transformed_expr)
            transformed_strings.append(f"{transformed_expr} = 0")
    # Return both lists
    return transformed_expressions, transformed_strings

def extract_variables(objective_variables_str):
    # Split the string by commas and strip any extra whitespace from each variable
    variables = [var.strip() for var in objective_variables_str.split(',') if var.strip()]
    return variables

def setup_lagrange_function(objective_function, constraints):
    # Define the Lagrange function starting with the objective function
    lagrange_function = sp.sympify(objective_function)

    # Counter to distinguish between different multipliers
    lambda_count = 1

    # List to hold complementary slackness expressions
    complementary_slackness_conditions = []

    # Iterate over the constraints, assuming they are already parsed and simplified
    for constraint_expr in constraints:
        # Create a new Lagrange multiplier symbol λ_i
        lambda_sym = sp.Symbol(f'lambda_{lambda_count}', positive=True)

        # Add the Lagrange multiplier term to the Lagrange function, with parentheses around the constraint
        lagrange_function += lambda_sym*(constraint_expr)

        # Add complementary slackness condition for inequality constraints, with parentheses around the constraint
        complementary_slackness_conditions.append(f"{lambda_sym}*({constraint_expr}) = 0")

        # Increment the lambda counter
        lambda_count += 1

    return lagrange_function, complementary_slackness_conditions

def find_partial_derivatives(lagrange_function, variables):
    # List to hold partial derivatives as strings
    partial_derivatives = []

    # Calculate the partial derivative with respect to each variable
    for var in variables:
        partial_derivative = simplify(sp.diff(lagrange_function, var))
        partial_derivatives.append(f"{partial_derivative} = 0")

    return partial_derivatives

def convert_sympy_to_latex(expressions_list, objective_variables_symbols):
    # Create lambda symbols and combine them with objective variable symbols
    lambda_symbols = [sp.Symbol(f'lambda_{i+1}', positive=True) for i in range(len(expressions_list))]  # Adjust the range as needed
    
    all_symbols = lambda_symbols + objective_variables_symbols

    # Create a dictionary for the symbols to be used in sympify
    local_dict = {symbol.name: symbol for symbol in all_symbols}

    # Sympify each element in the list
    sympified_list = []
    for expr in expressions_list:
        try:
            if '<=' in expr:
                parts = expr.split("<=")
                lhs = sp.sympify(parts[0].strip(), locals=local_dict)
                rhs = sp.sympify(parts[1].strip(), locals=local_dict)
                sympified_expr = sp.Rel(lhs, rhs, '<=')  # This will keep the relation intact as an inequality
            # If the expression contains '=', treat it as an equation
            elif '=' in expr:
                lhs_str, rhs_str = expr.split('=')
                lhs = sp.sympify(lhs_str.strip(), locals=local_dict)
                rhs = sp.sympify(rhs_str.strip(), locals=local_dict)
                sympified_expr = sp.Eq(lhs, rhs)
            else:
                # Otherwise, just sympify the expression
                sympified_expr = sp.sympify(expr, locals=local_dict)
            sympified_list.append(sympified_expr)
        except (sp.SympifyError, TypeError) as e:
            sympified_list.append(f"Error sympifying: {expr} ({e})")

    # Now, convert each sympified element to LaTeX
    latex_list = []
    for sympified_expr in sympified_list:
        if isinstance(sympified_expr, sp.Basic):  # Ensure it's a SymPy expression
            # Convert to LaTeX using sympy's latex function
            latex_expr = sp.latex(sympified_expr)

            # Replace lambda symbols with the appropriate LaTeX representation
            for symbol in lambda_symbols:
                index = symbol.name.split('_')[1]  # Extract the index from lambda name
                latex_expr = latex_expr.replace(str(symbol), f'\\lambda_{{{index}}}')

            latex_list.append(latex_expr)
        else:
            latex_list.append(sympified_expr)  # Keep the original error message

    return latex_list

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
