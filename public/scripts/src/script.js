function gradeBook($, window, document) {
    $(function() {
        var hasStorageSupport = false,
            showSplash = true,
            courseCollection = [],
            courseMap = {},
            timeoutID;

        // Selector variables
        var doc = $(document),
            bodyElem = $("body"),
            mainWindowElem = $("#wrapper"),
            splashPageElem = $("#splash-page"),
            addCourseButton = $("#add-course-item"),
            // modal windows
            addAssessmentElem = $("#add-assessment-modal"),
            editAssessmentElem = $("#edit-assessment-modal"),
            courseSummaryElem = $("#course-summary"),
            // input fields -- add item
            newAssessmentTitle = addAssessmentElem.find("input#assessment-title"),
            newAssessmentWeight = addAssessmentElem.find("input#assessment-weight"),
            newAssessmentResult = addAssessmentElem.find("input#assessment-result"),
            newAssessmentResultTotal = addAssessmentElem.find("input#assessment-result-total"),
            // input fields -- edit item
            editAssessmentTitle = editAssessmentElem.find("input#assessment-title"),
            editAssessmentWeight = editAssessmentElem.find("input#assessment-weight"),
            editAssessmentResult = editAssessmentElem.find("input#assessment-result"),
            editAssessmentResultTotal = editAssessmentElem.find("input#assessment-result-total");

       /**
        * HELPER FUNCTIONS
        */
        function fadeAndScale(elem) {
            elem.css({
                opacity: 0,
                height: "0%"
            });

            // Make sure the initial state is applied.
            elem.css("opacity");
            elem.css("height");

            // Fade it in.
            elem.css({
                opacity: 1,
                height: "100%"
            });
        }

        function resetFields(fieldList) {
            for (var i = 0, len = fieldList.length; i < len; i++) {
                fieldList[i].val("");
            }
        }

        // http://stackoverflow.com/questions/12243898/how-to-select-all-text-in-contenteditable-div
        $.fn.selectText = function(){
            var doc = document,
                element = this[0];

            if (doc.body.createTextRange) {
                var range = document.body.createTextRange();
                range.moveToElementText(element);
                range.select();
            } else if (window.getSelection) {
                var selection = window.getSelection();        
                var range = document.createRange();
                range.selectNodeContents(element);
                selection.removeAllRanges();
                selection.addRange(range);
            }
        };

        /**
         * HANDLER FUNCTIONS
         */
        function hideSplashHandler() {
            splashPageElem.addClass("fade-out");
            splashPageElem.one(transitionEnd, displayMainScreenHandler);
            localStorage.setItem("showSplash", "false");
        }

        function displayMainScreenHandler() {
            splashPageElem.addClass("hidden");
            mainWindowElem.removeClass("hidden").addClass("fade-in");
        }

        // Creates a new Course object and calls createCourse everytime
        // the new course button is pressed
        function addCourseHandler() {
            var course = new Course("", "");

            if (hasStorageSupport) saveToStorage(course.id, course);

            createCourse(course);
        }

        // Called at startup to retrieve course objects from the localStorage
        // then calls createCourse to create the DOM objects
        function loadCourseItems(id) {
            var course = JSON.parse(localStorage.getItem(id)),
                newCourse = {};

            // restore as a Course object
            course.__proto__ = Course.prototype;
            course.restoreAssessments();

            newCourse = createCourse(course);

            for (var i = 0, len = course.assessments.length; i < len; i ++) {
                var assessment = course.assessmentMap[course.assessments[i]],
                    assessmentItem = createAssessment(assessment);
                
                newCourse.find(".assessments-container").append(assessmentItem);
            }
        }

        function createCourse(course) {
            var newCourse = $(emptyCourseTemplate),
                title = course.title === "" ? "[Course Title]" : course.title,
                code = course.code === "" ? "[Course Code]" : course.code;
            
            if (courseCollection.indexOf(course.id) === -1) {
                courseCollection.push(course.id);
            }

            if (hasStorageSupport) {
                saveToStorage("courseCollection", courseCollection);
            }
            courseMap[course.id] = course;

            // DOM manipulations
            addCourseButton.before(newCourse);
            newCourse.attr("data-cid", course.id);
            newCourse.find("span.course-title").text(title);
            newCourse.find("span.course-code").text(code);
            updateGrade(course);

            // Make the element fully transparent.
            fadeAndScale(newCourse);
            return newCourse;
        }


        function addModalHandler() {
            var _this = $(this),
                courseContainerElem = _this.parents(".course-item-container"),
                internalID = courseContainerElem.attr("data-cid");

            addAssessmentElem.addClass("modal-show");
            addAssessmentElem.find("#save-assessment").attr("data-cid", internalID);
        }

        function editModalHandler() {
            var _this = $(this),
                courseContainerElem = _this.parents(".course-item-container"),
                courseID = courseContainerElem.attr("data-cid"),
                assessmentID = _this.attr("data-aid");

            var course = courseMap[courseID],
                assessment = course.assessmentMap[assessmentID];

            editAssessmentElem.addClass("modal-show");
            editAssessmentElem.find("#update-assessment, #delete-assessment").attr("data-aid", assessmentID);
            editAssessmentElem.find("#update-assessment, #delete-assessment").attr("data-cid", courseID);

            // Re-populate the fields
            editAssessmentTitle.val(assessment.title);
            editAssessmentWeight.val(assessment.weight);
            editAssessmentResult.val(assessment.result);
            editAssessmentResultTotal.val(assessment.total);

            // Repopulate placeholders
            editAssessmentTitle.attr("placeholder", assessment.title);
            editAssessmentWeight.attr("placeholder", assessment.weight);
            editAssessmentResult.attr("placeholder", assessment.result);
            editAssessmentResultTotal.attr("placeholder", assessment.total);
        }

        function updateAssessmentHandler() {
            var _this = $(this),
                assessmentID = _this.attr("data-aid"),
                courseID = _this.attr("data-cid"),
                oldAssessmentElem = $(".assessment-item[data-aid='" + assessmentID + "']");

            var course = courseMap[courseID],
                assessment = course.assessmentMap[assessmentID],
                assessmentElem = "";

            assessment.title = editAssessmentTitle.val();
            assessment.weight = parseFloat(editAssessmentWeight.val());
            assessment.result = parseFloat(editAssessmentResult.val());
            assessment.total = parseFloat(editAssessmentResultTotal.val());

            course.assessmentMap[assessmentID] = assessment;
            course.calculateGrades();
            if (hasStorageSupport) saveToStorage(courseID, course);


            // DOM Operations
            updateGrade(course);
            assessmentElem = createAssessment(assessment);

            var prevElem = oldAssessmentElem.prev();

            if (prevElem.length === 0) {
                var nextElem = oldAssessmentElem.next();

                if (nextElem.length === 0) {
                    oldAssessmentElem.parent().append(assessmentElem);
                    oldAssessmentElem.remove();
                } else {
                    nextElem.before(assessmentElem);
                    oldAssessmentElem.remove();
                }
            } else {
                prevElem.after(assessmentElem);
                oldAssessmentElem.remove();
            }

            editAssessmentElem.removeClass("modal-show");
        }

        function addAssessment() {
            var title = newAssessmentTitle.val(),
                weight = parseFloat(newAssessmentWeight.val()),
                result = parseFloat(newAssessmentResult.val()),
                resultTotal = parseFloat(newAssessmentResultTotal.val());

            if (isNaN(weight) || isNaN(result) || isNaN(resultTotal) || (result > resultTotal)) {
                alert("Entered incorrect values");
                return false;
            }

            // prevent the use of html tags
            title = title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

            var cid = $(this).attr("data-cid"),
                course = courseMap[cid],
                assessment = new Assessment(title, weight, result, resultTotal);

            course.insertAssessment(assessment);
            localStorage.setItem(cid, JSON.stringify(course));
            updateGrade(course);


            $(".course-item-container[data-cid='" + cid + "']")
                .find(".assessments-container")
                .append(createAssessment(assessment));

            resetFields([newAssessmentTitle, newAssessmentWeight, newAssessmentResult, newAssessmentResultTotal]);
            addAssessmentElem.removeClass("modal-show");
        }

        function createAssessment(item) {
            var assessmentItem = "";

            assessmentItem += "<div class='assessment-item' data-aid='" + item.id + "'>";
            assessmentItem += "<div class='title'>" + item.title + "</div>";
            assessmentItem += "<div class='mark'>" + item.getResult().toFixed(2) + "</div>";
            assessmentItem += "<div class='weight'>" + item.weight + "%</div></div>";

            return assessmentItem;
        }

        function courseSummaryHandler() {
            var _this = $(this),
                courseID = _this.parents(".course-item-container").attr("data-cid"),
                course = courseMap[courseID];

            courseSummaryElem.attr("data-cid", courseID);
            courseSummaryElem.find("span.course-title").text(course.title);
            courseSummaryElem.find("span.current-grade").text(course.currentGrade.toFixed());
            courseSummaryElem.find("span.highest-mark").text(course.getHighestAssessment().getResult().toFixed());
            courseSummaryElem.find("span.highest-assessment-title").text(course.getHighestAssessment().title);
            courseSummaryElem.find("span.lowest-mark").text(course.getLowestAssessment().getResult().toFixed());
            courseSummaryElem.find("span.lowest-assessment-title").text(course.getLowestAssessment().title);

            if (course.target > -1) {
                courseSummaryElem.find("input#target-grade").val(course.target);
                $("input#target-grade").trigger("keyup");
            } else {
                courseSummaryElem.find("input#target-grade").val("");
                courseSummaryElem.find("p.proper-target").addClass("hidden");
                courseSummaryElem.find("p.no-target").removeClass("hidden");
            }
            
            courseSummaryElem.addClass("modal-show");
        }

        function targetGradeHandler() {
            var _this = $(this),
                courseID = courseSummaryElem.attr("data-cid"),
                course = courseMap[courseID],
                target = _this.val();

            if (target) {
                courseSummaryElem.find(".error-message").addClass("hidden");
                target = parseFloat(target);

                if (target < 0 || target > 100) {
                    courseSummaryElem.find("p.proper-target").addClass("hidden");
                    courseSummaryElem.find("p.invalid-target").removeClass("hidden");
                } else {
                    var remaining = 100 - course.getTotalWeight(),
                        remainingAverage = ((target - course.totalGrade) / remaining) * 100;

                    course.target = target;
                    courseMap[courseID] = course;

                    if (hasStorageSupport) saveToStorage(courseID, course);
                
                    courseSummaryElem.find("span.target-grade").text(target.toFixed());
                    courseSummaryElem.find("span.remaining-average").text(remainingAverage.toFixed());
                    courseSummaryElem.find("p.proper-target").removeClass("hidden");
                }
            } else {
                courseSummaryElem.find("p.proper-target").addClass("hidden");
                courseSummaryElem.find("p.no-target").removeClass("hidden");
            }
        }

        function closeModalHandler() {
            $(".modal-window").removeClass("modal-show");
        }

        function inlineEditHandler(e) {
            var _this = $(this),
                currText = _this.text(),
                className = _this.attr("class").split(" ")[0];

            if (e.keyCode === 13 || e.keyCode === 9) {
                _this.trigger("blur");
                _this.html(currText);

                if (hasStorageSupport) {
                    var id = _this.parents(".course-item-container").attr("data-cid"),
                        course = JSON.parse(localStorage.getItem(id)),
                        key = className.split("-")[1];

                    course[key] = _this.text();
                    courseMap[key] = course;
                    saveToStorage(id, course);
                }
            }

            // If a timer was already started, clear it.
            if (timeoutID) clearTimeout(timeoutID);
            
            // Set timer that will save comment when it fires.
            timeoutID = setTimeout(function () {
                if (hasStorageSupport) {
                    // Save to local storage
                    var id = _this.parents(".course-item-container").attr("data-cid"),
                        course = JSON.parse(localStorage.getItem(id)),
                        key = className.split("-")[1];

                    course[key] = _this.text();
                    courseMap[key] = course;
                    saveToStorage(id, course);
                }                
            }, 350);
        }

        function updateGrade(course) {
            var courseElem = bodyElem.find(".course-item-container[data-cid='" + course.id + "']"),
                gradeContainer = courseElem.find(".grade-container"),
                gradeElem = gradeContainer.find("span.grade"),
                gradeClass = getGradeClass(course.currentGrade),
                classes = gradeContainer.attr("class");

            var grade = course.currentGrade;

            // remove existing grade classes
            classes = classes.split(" ")[0];
            
            if (grade === -1) {
                gradeElem.text("--%");
            } else {
                gradeElem.text(parseFloat(course.currentGrade).toFixed(2) + "%");
                gradeContainer.attr("class", classes);
                gradeContainer.addClass(gradeClass);
            }
        }

        function startEdit() {
            if ($(this).hasClass("first-time")) {
                $(this).text("");
                $(this).removeClass("first-time");
            } else {
                $(this).selectText();
            }

            $(this).addClass("editing");
        }

        function endEdit() {
            var _this = $(this),
                className = _this.attr("class").split(" ")[0];
            _this.removeClass("editing");

            if (hasStorageSupport) {
                var id = _this.parents(".course-item-container").attr("data-cid"),
                    course = JSON.parse(localStorage.getItem(id)),
                    key = className.split("-")[1];

                course[key] = _this.text();
                courseMap[key] = course;
                saveToStorage(id, course);    
            }
        }

        function saveToStorage(key, val) {
            if (typeof val === "string") {
                localStorage.setItem(key, val);    
            } else if (typeof val === "object") {
                localStorage.setItem(key, JSON.stringify(val));
            }            

            console.log("Saving " + key + "...");
        }

        function restoreStorage() {
            if (localStorage.getItem("courseCollection")) {
                courseCollection = JSON.parse(localStorage.getItem("courseCollection"));

                for (var i = 0, len = courseCollection.length; i < len; i++) {
                    loadCourseItems(courseCollection[i]);
                }
            } else {
                courseCollection = [];
                saveToStorage("courseCollection", courseCollection);
            }
        }

        function startApp() {
            if (hasStorageSupport) {
                if (localStorage.getItem("version") < 1) {
                    for (item in localStorage) {
                        delete localStorage[item];
                    }
                    localStorage.setItem("version", 1);
                } else {
                    restoreStorage();
                }

                if (localStorage.getItem("showSplash")) {
                    showSplash = false;
                } 
            }
            
            if (showSplash) {
                splashPageElem.removeClass("hidden");
            } else {
                displayMainScreenHandler();
            }
        }

        /**
         * EVENT HANDLERS
         */
        bodyElem.on('click', '#start-now', hideSplashHandler)
                .on('click', '#add-course-item', addCourseHandler)
                .on('click', '.add-assessment', addModalHandler)
                .on('click', '.assessment-item', editModalHandler)
                .on('click', '#modal-close, .modal-overlay', closeModalHandler)
                .on('click', '.grade-container', courseSummaryHandler);

        addAssessmentElem.on('click', "#save-assessment", addAssessment);
        editAssessmentElem.on('click', "#update-assessment", updateAssessmentHandler);
        courseSummaryElem.on('keyup', 'input#target-grade', targetGradeHandler);
        
        // click-to-edit function for titles
        bodyElem.on('keyup', '.contenteditable', inlineEditHandler)
                .on('click', '.contenteditable', startEdit)
                .on('blur', '.contenteditable', endEdit);
        

        // ENTRY POINT!
        // test for HTML5 localStorage support
        if (!window.localStorage) {
            var messageModal = $("#no-autosave");

            messageModal.addClass("modal-show");
            messageModal.on('click', '#continue', function() {
                messageModal.removeClass("modal-show");
                startApp();
            });
        } else {
            hasStorageSupport = true;
            startApp();
        }
    });

    var courseIDCounter = 1,
        assessmentIDCounter = 1,
        transitionEnd = "webkitTransitionEnd otransitionend oTransitionEnd " + 
            "msTransitionEnd transitionend",
        emptyCourseTemplate = "<div class='course-item-container' data-cid='-1'>" + 
            "<div class='course-item'>" + 
                "<div class='content-container'>" + 
                    "<div class='course-title-container'>" +
                        "<span class='course-title first-time contenteditable' " + 
                            "contenteditable='true'>[Course Title]</span>" + 
                    "</div>" +
                    "<div class='course-code-container'>" + 
                        "<span class='course-code first-time contenteditable' " + 
                            "contenteditable='true'>[Course Code]</span>" + 
                    "</div>" +
                    "<div class='add-assessment-container'>" +
                        "<span class='add-assessment button button-round'>+ Add an Assessment</span>" + 
                    "</div>" +
                    "<div class='assessments-container clearfix'></div>" + 
                "</div>" + 
            "<div class='grade-container'>" +
                "<span class='grade'>--%</span></div></div>";

    function Course(title, code) {
        this.title = title;
        this.code = code;
        this.id = generateID("course");

        this.target = -1;               // user's target grade
        this.currentGrade = -1;         // weighted average so far
        this.totalGrade = -1;           // total weighted average

        this.assessments = [];
        this.assessmentMap = {};
    }

    Course.prototype.restoreAssessments = function() {
        for (var i = 0, len = this.assessments.length; i < len; i++) {
            this.assessmentMap[this.assessments[i]].__proto__ = Assessment.prototype;
        }
    };

    Course.prototype.insertAssessment = function(obj) {
        this.assessments.push(obj.id);
        this.assessmentMap[obj.id] = obj;
        this.calculateGrades();
    };

    Course.prototype.calculateGrades = function() {
        var resultSum = 0,
            totalSum = 0;

        for (var i = 0, len = this.assessments.length; i < len; i++) {
            var a = this.assessmentMap[this.assessments[i]];
            
            resultSum += a.getWeightedResult();
            totalSum += a.weight;
        }

        console.log("resultSum " + resultSum + " ; totalSum " + totalSum);

        this.totalGrade = resultSum;
        this.currentGrade = (resultSum / totalSum) * 100;
    };

    Course.prototype.getTotalWeight = function() {
        var sum = 0;
        for (var i = 0, len = this.assessments.length; i < len; i++) {
            var a = this.assessmentMap[this.assessments[i]];

            sum += a.weight;
        }

        return sum;
    };

    Course.prototype.getHighestAssessment = function() {
        var highest = -1,
            highestIndex = -1;

        for (var i = 0, len = this.assessments.length; i < len; i++) {
            var a = this.assessmentMap[this.assessments[i]];

            if (a.getResult() > highest) {
                highestIndex = i;
                highest = a.getResult();
            }
        }

        return this.assessmentMap[this.assessments[highestIndex]];
    };

    Course.prototype.getLowestAssessment = function() {
        var lowest = 999999,
            lowestIndex = -1;

        for (var i = 0, len = this.assessments.length; i < len; i++) {
            var a = this.assessmentMap[this.assessments[i]];

            if (a.getResult() < lowest) {
                lowestIndex = i;
                lowest = a.getResult();
            }
        }

        return this.assessmentMap[this.assessments[lowestIndex]];
    };

    function Assessment(title, weight, result, total) {
        this.title = title;
        this.weight = weight;   // stored as a percent without %; stored as 25 instead of 0.25
        this.result = result;
        this.total = total;
        this.id = generateID("assessment");
    }

    Assessment.prototype.getResult = function() {
        return (this.result / this.total) * 100;
    };

    Assessment.prototype.getWeightedResult = function(first_argument) {
        return (this.result / this.total) * this.weight;
    };

    // https://gist.github.com/gordonbrander/2230317
    function generateID(type) {
        if (type === "course") {
            return "_c" + Math.random().toString(36).substr(2, 9);
        } else {
            return "_a" + Math.random().toString(36).substr(2, 9);
        }
    }

    function getGradeClass(grade) {
        if (grade >= 50) {
            var curr = 85;

            do {
                if (grade >= curr) { 
                    return "above-" + curr;
                } else {
                    curr -= 5;
                }
            }
            while (curr >= 50);
        } else { 
            return "below-50";
        }
    }
}

(function(app) {
    app(window.jQuery, window, document);
}(gradeBook));