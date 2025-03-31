jQuery(document).ready(function($) {
    const $form = $('#mental-health-screening-form');
    const $screeningStages = $('#screening-stages');
    const $prevStageBtn = $('#prev-stage');
    const $nextStageBtn = $('#next-stage');
    const $submitBtn = $('#submit-screening');
    const $resultsContainer = $('#screening-results');

    let currentStage = 1;
    let totalStages = 1;
    let screeningResponses = {};

    function updateNavigationButtons() {
        $prevStageBtn.toggleClass('hidden', currentStage === 1);
        $nextStageBtn.toggleClass('hidden', currentStage === totalStages);
        $submitBtn.toggleClass('hidden', currentStage !== totalStages);
    }

    $nextStageBtn.on('click', function() {
        // Validate current stage
        const $currentStage = $(`[data-stage="${currentStage}"]`);
        if (!validateStage($currentStage)) {
            return;
        }

        // Collect responses
        collectResponses($currentStage);

        // If we don't have the next stage, request from server
        if (currentStage === totalStages) {
            $submitBtn.show();
            $nextStageBtn.hide();
            return;
        }

        // Move to next stage
        $currentStage.removeClass('active');
        currentStage++;
        $(`[data-stage="${currentStage}"]`).addClass('active');
        
        updateNavigationButtons();
    });

    $prevStageBtn.on('click', function() {
        if (currentStage > 1) {
            $(`[data-stage="${currentStage}"]`).removeClass('active');
            currentStage--;
            $(`[data-stage="${currentStage}"]`).addClass('active');
            
            updateNavigationButtons();
        }
    });

    $form.on('submit', function(e) {
        e.preventDefault();

        // Final validation
        const $currentStage = $(`[data-stage="${currentStage}"]`);
        if (!validateStage($currentStage)) {
            return;
        }

        // Collect final stage responses
        collectResponses($currentStage);

        // Submit screening
        $.ajax({
            url: '/submit-screening',  // Updated endpoint
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ responses: screeningResponses }),
            success: function(response) {
                if (response.success) {
                    // Hide form, show results
                    $screeningStages.hide();
                    $('#screening-navigation').hide();
                    $resultsContainer.removeClass('hidden');

                    // Populate results
                    const analysis = response.analysis;
                    $('#results-content').html(`
                        <p>Risk Level: ${analysis.risk_level}</p>
                        <h4>Observations:</h4>
                        <ul>
                            ${analysis.observations.map(obs => `<li>${obs}</li>`).join('')}
                        </ul>
                    `);

                    // Populate resource recommendations
                    const resourceHtml = Object.entries(analysis.recommended_resources)
                        .map(([category, resources]) => `
                            <h4>${category}</h4>
                            <ul>
                                ${resources.map(resource => `<li>${resource}</li>`).join('')}
                            </ul>
                        `).join('');
                    $('#resource-recommendations').html(resourceHtml);
                } else {
                    alert('There was an error processing your screening.');
                }
            },
            error: function() {
                alert('There was a connection error. Please try again.');
            }
        });
    });

    function validateStage($stage) {
        const invalidFields = $stage.find('input, select, textarea').filter(function() {
            return !this.value.trim();
        });

        if (invalidFields.length) {
            alert('Please complete all fields before continuing.');
            invalidFields.first().focus();
            return false;
        }
        return true;
    }

    function collectResponses($stage) {
        $stage.find('input, select, textarea').each(function() {
            screeningResponses[$(this).attr('name').replace('responses[', '').replace(']', '')] = $(this).val();
        });
    }

    // Initial setup
    updateNavigationButtons();
});