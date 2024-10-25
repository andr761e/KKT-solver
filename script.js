$(document).ready(function() {
    try {
        const MQ = MathQuill.getInterface(2);

        // Function to initialize MathQuill fields with placeholder functionality
        function initializeMathFields(elements) {
            elements.forEach(element => {
                // Create the MathQuill editable field
                const mathField = MQ.MathField(element, {
                    spaceBehavesLikeTab: true,
                    handlers: {
                        edit: function() {
                            // Hide placeholder if there's content, otherwise show it
                            const latex = mathField.latex();
                            const placeholderDiv = element.querySelector('.mq-placeholder');
                            if (latex) {
                                placeholderDiv.style.display = 'none';
                            } else {
                                placeholderDiv.style.display = 'block';
                            }
                        }

                        
                    }
                });

                // Save the MathQuill instance on the element
                element.mathField = mathField;

                // Show toolbar when the field or its wrapper is clicked
                element.addEventListener('mousedown', function(event) {
                    const toolbar = document.getElementById('math-toolbar');
                    toolbar.style.display = 'block';
                    toolbar.style.top = `${element.getBoundingClientRect().bottom + window.scrollY}px`;
                    toolbar.style.left = `${element.getBoundingClientRect().left + window.scrollX}px`;

                    // Save a direct reference to the current mathField being edited
                    toolbar.activeMathField = mathField;
                });

                // Allow the entire field to be clicked
                element.addEventListener('click', function(event) {
                    const toolbar = document.getElementById('math-toolbar');
                    toolbar.style.display = 'block';
                    toolbar.style.top = `${element.getBoundingClientRect().bottom + window.scrollY}px`;
                    toolbar.style.left = `${element.getBoundingClientRect().left + window.scrollX}px`;

                    // Save a reference to the current mathField being edited
                    toolbar.dataset.activeField = element.id;
                });

                // Create a placeholder div
                const placeholderText = element.getAttribute('placeholder');
                if (placeholderText) {
                    const placeholderDiv = document.createElement('div');
                    placeholderDiv.className = 'mq-placeholder';
                    placeholderDiv.textContent = placeholderText;
                    placeholderDiv.style.position = 'absolute';
                    placeholderDiv.style.pointerEvents = 'none';
                    placeholderDiv.style.opacity = '0.5';
                    placeholderDiv.style.color = '#aaa';
                    placeholderDiv.style.padding = '8px';

                    // Append placeholder to the element
                    element.style.position = 'relative';
                    element.appendChild(placeholderDiv);

                    // Handle focus events to hide the placeholder
                    element.addEventListener('focusin', function() {
                        placeholderDiv.style.display = 'none';
                    });

                    // Handle blur events to show the placeholder if empty
                    element.addEventListener('focusout', function() {
                        if (!mathField.latex()) {
                            placeholderDiv.style.display = 'block';
                        }
                    });
                }
            });
        }

        // Initialize MathQuill for existing fields with placeholders
        initializeMathFields(document.querySelectorAll('.mathquill-editable'));

        // Adding new constraints
        const addConstraintButton = document.getElementById('add-constraint');
        const removeConstraintButton = document.getElementById('remove-constraint');
        const constraintsContainer = document.getElementById('constraints');
        let constraintCount = 1;

        addConstraintButton.addEventListener('click', () => {
            constraintCount++;

            const newConstraint = document.createElement('div');
            newConstraint.classList.add('constraint');
            newConstraint.id = `constraint-${constraintCount}`;

            newConstraint.innerHTML = `
                <span class="constraint-function mathquill-editable" placeholder="Enter constraint function"></span>
                <select class="constraint-type">
                    <option value="leq">&le;</option>
                    <option value="geq">&ge;</option>
                    <option value="eq">=</option>
                </select>
                <span class="constraint-value mathquill-editable" placeholder="Enter value"></span>
            `;

            constraintsContainer.insertBefore(newConstraint, addConstraintButton);

            // Initialize MathQuill for the newly added fields
            initializeMathFields(newConstraint.querySelectorAll('.mathquill-editable'));
        });

        // Removing the last constraint
        removeConstraintButton.addEventListener('click', () => {
            if (constraintCount > 1) {  // Ensure there is more than one constraint to remove
                const lastConstraint = document.getElementById(`constraint-${constraintCount}`);
                if (lastConstraint) {
                    constraintsContainer.removeChild(lastConstraint);
                    constraintCount--;
                }
            }
        });

        // Toolbar button click handler
        document.querySelectorAll('.math-btn').forEach(button => {
            button.addEventListener('click', function() {
                const toolbar = document.getElementById('math-toolbar');
                const symbol = button.getAttribute('data-symbol');
                const activeMathField = toolbar.activeMathField;

                // Write the symbol to the active MathQuill field
                if (activeMathField) {
                    activeMathField.write(symbol);
                    activeMathField.focus();
                }
            });
        });

        // Hide the toolbar when clicking outside
        document.addEventListener('mousedown', (event) => {
            const toolbar = document.getElementById('math-toolbar');
            if (!toolbar.contains(event.target) && !event.target.classList.contains('mathquill-editable')) {
                toolbar.style.display = 'none';
            }
        });

        // Show the result container when "Calculate KKT Conditions" button is clicked
        document.getElementById('calculate-kkt').addEventListener('click', () => {
            // Properly declare the data variable
            const data = {};

            try {
                // Extract Objective Function
                const objectiveFunction = document.getElementById('objective-function').mathField.latex();
                if (!objectiveFunction || objectiveFunction.trim() === '') {
                    alert('Objective function field is empty. Please provide a valid function.');
                    return;
                }
                const objectiveType = document.getElementById('objective-type').value;
                data.objectiveFunction = {
                    type: objectiveType,
                    function: objectiveFunction
                };

                // Extract Constraints
                const constraints = [];
                document.querySelectorAll('.constraint').forEach((constraint, index) => {
                    const constraintFunction = constraint.querySelector('.constraint-function').mathField.latex();
                    const constraintType = constraint.querySelector('.constraint-type').value;
                    const constraintValue = constraint.querySelector('.constraint-value').mathField.latex();

                    constraints.push({
                        function: constraintFunction,
                        type: constraintType,
                        value: constraintValue
                    });
                });
                data.constraints = constraints;

                // Extract Objective Variables
                const objectiveVariables = document.getElementById('objective-variables').mathField.latex();
                data.objectiveVariables = objectiveVariables;

                //List of the variables
                const objectiveVariablesList = objectiveVariables.split(',').map(item => item.trim());
                console.log(objectiveVariablesList)
                
                const resultContainer = document.getElementById('result-container');
                resultContainer.style.display = 'block';


                // Get the number of constraints
                const n = constraints.length;

                // Generate Lagrange Multipliers Condition String with Subscripts
                let lagrangeMultipliers = Array.from({ length: n }, (_, i) => `\\lambda_{${i + 1}}`).join(', ');
                const lagrangeMultipliersResult = `${lagrangeMultipliers} ≥ 0`;

                // Display the Lagrange multipliers immediately with proper formatting using innerHTML
                lagrangeResultSpan = document.getElementById('lagrange-multipliers-result')
                MQ.StaticMath(lagrangeResultSpan).latex(lagrangeMultipliersResult);

                // Log the data object to the console for debugging
                console.log('Data object to be sent to backend:', data);


                // Send Data to Backend
                fetch('http://127.0.0.1:5000/calculate-kkt', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                })
                .then(response => response.json())
                .then(result => {
                    console.log(result)
                    // Display the result container
                    const resultContainer = document.getElementById('result-container');
                    if (resultContainer) {
                        resultContainer.style.display = 'flex';
                    }
                    
                    //Transform the results back into a javascript list
                    const resultObjectiveGradientTrans = result.objectiveGradient.join(', ').split(',').map(item => item.trim());
                    const resultLagrangeGradientTrans = result.lagrangeGradient.join(', ').split(',').map(item => item.trim());
                    const resultComplementarySlacknessTrans = result.complementarySlackness.join(', ').split(',').map(item => item.trim());
                    const resultLagrangeFunction = result.lagrangeFunction[0]; 
                    
                    //Update Lagrange function
                    let latexFunc = "L \\left(" + objectiveVariablesList.join(',') + "," + lagrangeMultipliers + "\\right) =";
                    lagrangeFunctionSpan = document.getElementById('lagrange-function-result')
                    MQ.StaticMath(lagrangeFunctionSpan).latex(latexFunc + resultLagrangeFunction);

                    // Update Objective Gradient Condition
                    const objectiveGradientDiv = document.getElementById('objective-gradient-condition');
                    if (objectiveGradientDiv) {
                        // Clear previous entries if any
                        objectiveGradientDiv.querySelectorAll('span').forEach(span => span.remove());
                        let counter = 0;
                        resultObjectiveGradientTrans.forEach((gradientCondition) => {
                            // Create a span element for MathQuill rendering
                            const span = document.createElement('span');
                            span.className = 'math-field'; // Optional, for styling or reference purposes
                            span.style.display = 'block';
                            objectiveGradientDiv.appendChild(span);
                            const partialDerivativeString = `\\frac{\\partial L}{\\partial ${objectiveVariablesList[counter]}} = `
                            // Render the LaTeX using MathQuill
                            MQ.StaticMath(span).latex(partialDerivativeString + gradientCondition);
                            counter++;
                        });
                    }

                    // Update Constraints Conditions
                    const constraintsDiv = document.getElementById('constraints-conditions');
                    if (constraintsDiv) {
                        // Clear previous entries if any
                        constraintsDiv.querySelectorAll('span').forEach(span => span.remove());
                        resultLagrangeGradientTrans.forEach((constraintCondition) => {
                            // Create a span element for MathQuill rendering
                            const span = document.createElement('span');
                            span.className = 'math-field'; // Optional, for styling or reference purposes
                            span.style.display = 'block';
                            constraintsDiv.appendChild(span);
                            
                            // Render the LaTeX using MathQuill
                            MQ.StaticMath(span).latex(constraintCondition);
                        });
                    }

                    // Update Complementary Slackness Conditions
                    const slacknessDiv = document.getElementById('complementary-slackness-condition');
                    if (slacknessDiv) {
                        // Clear previous entries if any
                        slacknessDiv.querySelectorAll('span').forEach(span => span.remove());
                        resultComplementarySlacknessTrans.forEach((slacknessCondition) => {
                            // Create a span element for MathQuill rendering
                            const span = document.createElement('span');
                            span.className = 'math-field'; // Optional, for styling or reference purposes
                            span.style.display = 'block';
                            slacknessDiv.appendChild(span);
                            
                            // Render the LaTeX using MathQuill
                            MQ.StaticMath(span).latex(slacknessCondition);
                        });
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                });

            } catch (error) {
                console.error('Data extraction error:', error);
            }
        });

    } catch (error) {
        console.error("MathQuill failed to initialize:", error);
    }
});


