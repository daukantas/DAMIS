(function() {
	window.taskBoxes = {
		countBoxes: 0,

		// Maps task boxes to their endpoints
		taskBoxesToEndpoints: {},

		// remove all endpoints of a task box
		removeEndpoints: function(taskBoxId) {
			var epoints = window.taskBoxes.taskBoxesToEndpoints[taskBoxId];
			if (epoints) {
				if (epoints.ipoints) { // remove input endpoints
					$.each(epoints.ipoints, function(idx, e) {
						jsPlumb.deleteEndpoint(e);
					});
				}
				if (epoints.opoints) { // remove output endpoints
					$.each(epoints.opoints, function(idx, e) {
						jsPlumb.deleteEndpoint(e);
					});
				}
				delete window.taskBoxes.taskBoxesToEndpoints[taskBoxId];
			}
		},

		// Right-click on task box
		taskBoxRightClick: function(ev) {
			if (ev.button == 2) {
				var taskBox = $(ev.target).hasClass("task-box") ? $(ev.target) : $(ev.target).closest(".task-box");
                window.taskBoxes.removeTaskBox(taskBox);
			}
		},

        removeTaskBox : function(taskBox) {
	        var formWindow = $("#" + window.taskBoxes.getFormWindowId(taskBox));
	        formWindow.find(".delete-row").click(); // remove task form
	        formWindow.remove(); // remove the window
	        // all connections are automatically detached
	        // so this box outgoing connections input parameters are
	        // reset by "connectionDetached" event handler
	        window.taskBoxes.removeEndpoints(taskBox.attr("id"));
	        taskBox.remove(); // remove task box
        },

        // modify box name according to algorithm selection
        setBoxName: function(taskBoxId) {
			var formWindow = $("#" + window.taskBoxes.getFormWindowId(taskBoxId));
			var taskBox = $("#" + taskBoxId);
			taskBox.html("<div>" + formWindow.find(".task-form select[id$='-algorithm']").find("option:selected").text() + "</div>");
        },
        
		// delete existing endpoints and create new ones to reflect the
        // selected algorithm
		recreateEndpoints: function(taskBoxId, formWindow) {
            // Remove old endpoints
			window.taskBoxes.removeEndpoints(taskBoxId);
			// Add new endpoints for input/output parameters
            var parameters = formWindow.find('.parameter-values');

			var outAnchors = ["RightMiddle", [1, 0, 1, 1], [1, 1, 1, 1]];
			var oIdx = 0;
			var inAnchors = ["LeftMiddle", [0, 0, - 1, - 1], [0, 1, - 1, - 1]];
			var iIdx = 0;

			var ipoints = []
			var opoints = []

			var taskBox = $("#" + taskBoxId);

			// inspect each parameter form
			// each form has one "value" field and
			// indicator fields: "is_input", "is_output"
			$.each(parameters.find('div'), function(idx) {
				var isIn = $(this).find("input[id$='is_input']").val();
				var isOut = $(this).find("input[id$='is_output']").val();
				var paramName = "<span>" + $(this).find("span").text() + "</span>";

				if (isIn === "True") {
					//add input endpoint
					var x = jsPlumb.addEndpoint(taskBox, window.experimentCanvas.getTargetEndpoint(), {
						anchor: inAnchors[iIdx],
						parameters: {
							iParamNo: idx,
							// parameter form idx
							iTaskBoxId: taskBoxId
						},
					});
					ipoints.push(x);
					iIdx++;
				} else if (isOut === "True") {
					//add output endpoint
					var y = jsPlumb.addEndpoint(taskBox, window.experimentCanvas.getSourceEndpoint(), {
						anchor: outAnchors[oIdx],
						parameters: {
							oParamNo: idx,
							// parameter form idx
							oTaskBoxId: taskBoxId
						}
					});
					opoints.push(y);
					oIdx++;
				}
			});
			window.taskBoxes.taskBoxesToEndpoints[taskBoxId] = {
				"ipoints": ipoints,
				"opoints": opoints
			}
		},

		// Loads parameters for the selected algorithm
		loadAlgorithmParameters: function() {
			$.ajax({
				url: parametersUrl,
				data: {
					algorithm_id: $(this).val(),
					prefix: $(this).attr('name')
				},
				context: $(this)
			}).done(function(resp) {
                // replace old parameter formset with a new one
				var formWindow = $(this).closest('.task').parent();
				formWindow.find(".parameter-values").html(resp);
                
                // rename the box
			    var taskBoxId = window.taskBoxes.getBoxId(formWindow);
		        window.taskBoxes.setBoxName(taskBoxId);
				window.taskBoxes.recreateEndpoints(taskBoxId, formWindow);
			});
		},

        // create modal window and assign algorithm change handler
		createTaskFormDialog: function(taskForm, existingParameters, formWindowId) {
			var taskFormContainer = $("<div></div>");
			taskFormContainer.attr("id", formWindowId);
			taskFormContainer.addClass("task-window");
			taskFormContainer.append(taskForm);
			if (existingParameters) {
				taskFormContainer.append(existingParameters);
			} else {
				taskFormContainer.append("<div class=\"parameter-values\"></div>");
			}
			taskFormContainer.dialog({
				autoOpen: false,
				appendTo: "#task-forms",
				modal: true,
				// Cancel button should return the box to a previous state, but
				// that is too complicated for now, so no Cancel button
				buttons: [{
					text: "Close",
					click: function(ev) {
						$(this).dialog("close");
					}
				}]
			});
			taskForm.find(".algorithm-selection select").change(window.taskBoxes.loadAlgorithmParameters);
		},

		// create a new task box and modal window, assign event handlers 
		createTaskBox: function(ev, ui, taskContainer) {
			// drop the task where it was dragged
			var taskBox = $("<div><div>New task</div></div>");
			taskBox.appendTo(taskContainer);
			taskBox.css("left", ui.position.left + "px");
			taskBox.css("top", ui.position.top + "px");

			//assign id and class
			count = window.taskBoxes.countBoxes;
			window.taskBoxes.countBoxes++;
			taskBox.attr("id", "task-box-" + count);
			taskBox.addClass("task-box");

			// create a form for this box
			var addTaskBtn = $("a.add-row")
			addTaskBtn.click();
			var taskForm = addTaskBtn.prev();

			// create modal window for the form
			window.taskBoxes.createTaskFormDialog(taskForm, null, window.taskBoxes.getFormWindowId(taskBox));

            this.addTaskBoxEventHandlers(taskBox);
		},

        //adds task box event handlers: dbclick, mousedown, and makes it
        //draggable
        addTaskBoxEventHandlers: function(taskBox) {
            
            // delete task box on right-click
            taskBox.off("mousedown");
			taskBox.on("mousedown", this.taskBoxRightClick);

            // open dialog on dbclick
            taskBox.off("dbclick");
			taskBox.on("dblclick", function(ev) {
				var formWindowId = window.taskBoxes.getFormWindowId($(ev.currentTarget));
				$("#" + formWindowId).dialog('open');
			});

			//make the box draggable
			jsPlumb.draggable(taskBox, {
				grid: [20, 20],
				containment: "parent"
			});
        },

		//generates task box id from the provided task form 
		getBoxId: function(formWindow) {
			return formWindow.attr("id").replace("-form", "");
		},

		// generates task form id from the provided task box
		getFormWindowId: function(taskBox) {
			return taskBox instanceof $ ? taskBox.attr("id") + "-form": taskBox + "-form";
		},

	}

})();

