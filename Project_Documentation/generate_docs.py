import os

docs_dir = r"c:\Users\sameeksha\TreeCanopy\Project_Documentation"
os.makedirs(docs_dir, exist_ok=True)

chap1 = """1. INTRODUCTION

1.1 Introduction
Urbanization has brought about significant development and modernization across cities, but it has also introduced complex challenges in maintaining a clean, sustainable, and livable environment. Among these challenges, the rapid depletion of urban tree canopies and green cover has emerged as one of the most critical issues faced by metropolitan areas. As cities continue to expand rapidly in population and infrastructure, the increasing construction activities, combined with poor ecological planning, have led to the loss of numerous mature trees and green spaces. This loss of tree canopy not only diminishes the aesthetic appeal of the city but also contributes significantly to the urban heat island effect, increased air pollution, and ecological imbalances, posing serious health and environmental risks to urban communities.

The municipal authorities responsible for the city's ecological management have made several efforts to monitor and restore green cover. However, the traditional methods of monitoring and managing urban trees are often inefficient due to delays in reporting, lack of real-time coordination, and insufficient citizen engagement. Many citizens find it difficult to adopt trees, report illegal felling, or track the progress of their planted saplings, leading to reduced accountability and transparency. These limitations highlight the urgent need for a technological solution that bridges the gap between citizens, field officials, and administrators, ensuring timely communication and effective urban forestry management.

In this context, the proposed project, “Tree Canopy Management System,” introduces a Progressive Web Application (PWA) designed to transform the way tree-related data and issues are reported, managed, and resolved. The system leverages the power of digital connectivity, geolocation tracking, and automated communication to create a real-time, interactive, and transparent platform for citizens and authorities alike. The main objective of the system is to empower citizens to actively participate in maintaining green cover by easily adopting trees, reporting issues through photos, location details, and descriptions, while enabling administrators and field officials to handle these tasks efficiently through an integrated backend system.

1.2 Overview of the project
Maintaining urban green cover is a vital aspect of sustainable city development. With the rapid expansion of modern cities, efficient tree management has become a major priority for municipal authorities. However, the continuous removal of trees continues to disrupt the city's environmental balance. To overcome these issues, modern technology can play a transformative role by enabling digital participation, quick response, and transparent monitoring.

This project introduces a Progressive Web Application (PWA) for the Tree Canopy Management System, designed to support the vision of a clean and green city. The platform provides a single digital interface that connects citizens, field officials, and administrators, ensuring smooth communication and efficient management of urban trees. It allows users to adopt trees instantly, upload images, provide geolocation details, and add brief descriptions of tree health or illegal cutting. Each activity is recorded in real time and tracked throughout its lifecycle, promoting transparency and accountability.

The proposed system is structured into three core modules: Citizens, Admin, and Field Officials. The Citizens module enables citizens to register, log in, and actively participate by uploading photos of trees along with location coordinates. Citizens can also monitor the live status of their adopted trees or reports, receive email notifications for updates, and view the final resolution proof once an issue is addressed.

The Admin module acts as the control center, managing user data, official assignments, and tracking. It provides advanced functionalities like zones, divisions, and wards management, task allocation, and performance monitoring of field officials. The admin also receives instant updates and can generate analytical reports to evaluate the overall progress and efficiency of the tree management process.

The Field Officials module allows authorized staff to log in, access assigned tasks, verify reported issues, upload photos of tree inspections, and update statuses directly from the field. This not only enhances operational efficiency but also helps maintain accountability among on-ground workers.

1.3 Problem Statement
The growing population and rapid urbanization have led to significant challenges in maintaining green cover and effective urban forestry management. Among these challenges, the unauthorized felling of trees and the lack of proper tracking for newly planted saplings have become serious concerns for both the citizens and the municipal authorities. The loss of trees not only damages the city's image and aesthetics but also creates poor environmental conditions, leading to health hazards and pollution. Despite ongoing manual efforts by civic authorities, the lack of a proper monitoring and reporting system often results in delayed responses, inefficient coordination, and poor accountability.

Currently, citizens have limited means to adopt trees, report illegal cutting, or track the progress of their reports. Many reports go unnoticed due to the absence of a unified digital platform that connects citizens directly with municipal authorities. Moreover, communication gaps between citizens, administrators, and field officials often cause duplication of efforts or unresolved issues. Traditional methods of forestry management, which rely on manual paperwork and physical inspections, are time-consuming, prone to human error, and fail to ensure real-time updates.

There is a clear need for an integrated digital solution that enables timely reporting, transparent tracking, and efficient management of tree canopies. A system that allows citizens to easily capture and submit evidence of tree health or illegal felling, while empowering officials to manage, assign, and verify reports in real time, can significantly improve the city's green cover and operational efficiency.

To address these gaps, the proposed Tree Canopy Management System aims to create a centralized, interactive, and technology-driven platform. It will facilitate seamless communication among citizens, field officials, and administrators by providing features such as online registration, photos and location capture, email notifications, and status tracking.

1.4 Motivation
The rapid urbanization and population growth have led to a significant decrease in tree canopies. Unfortunately, this has resulted in numerous environmental issues across the city. These issues not only cause pollution and health hazards, but also affect the aesthetic appeal of neighborhoods and lower the overall quality of urban life. Despite various initiatives by local bodies, the timely identification and resolution of tree-related issues remain a major challenge due to the following reasons:
- Lack of Real-time Reporting Mechanisms
- Limited Transparency and Tracking
- Inefficient Communication between Stakeholders
- Lack of Public Engagement

These challenges motivated the development of a technology-driven solution that not only bridges the communication gap but also empowers citizens, streamlines field operations, and supports administrators with real-time data and actionable insights.

1.5 Significance of the Study
The proposed Tree Canopy Management System plays a crucial role in addressing one of the most pressing urban challenges faced by metropolitan cities – the loss of tree canopy. With the rapid pace of urbanization, increasing population density, and expanding infrastructure, environmental management has become a major concern. This study highlights the significance of leveraging modern digital technologies to enhance the efficiency, transparency, and accountability of urban forestry management systems while empowering citizens to participate actively in maintaining a green city environment.

The study holds great societal significance as it fosters active citizen engagement in civic problem-solving. By bridging the gap between citizens and local authorities, the system builds trust and encourages collective responsibility towards environmental preservation. From an administrative standpoint, this study provides an innovative solution for optimizing operational workflows. The system replaces traditional manual reporting and record-keeping processes with a fully automated digital platform.

Technologically, this study demonstrates the potential of web-based applications in enhancing smart governance and urban sustainability. The system integrates multiple modern technologies including geolocation services, cloud-based databases, and real-time synchronization to create a responsive and scalable digital infrastructure.

1.6 Objectives
The primary objective of the Tree Canopy Management System is to design and develop a Progressive Web Application (PWA) that provides an effective digital platform for reporting, monitoring, and managing tree canopies within the city. This project aims to assist municipal authorities in achieving a greener environment by integrating technology with citizen participation and administrative efficiency.

- To empower citizens by offering a simple and user-friendly interface through which they can register, adopt trees, and report issues by uploading photos, location details, and brief descriptions.
- To enable real-time tracking of reports so that users can monitor the progress and resolution status of their submissions, ensuring transparency and accountability.
- To provide administrators with a centralized control panel to manage citizen's accounts, officials, zones, divisions, and wards.
- To improve communication and coordination between all stakeholders – citizens, administrators, and field officials – by providing a unified digital platform.

1.7 Scope of the Project
The Tree Canopy Management System is designed to provide a comprehensive and technology-driven solution for addressing one of the city's most persistent urban challenges – the loss of tree canopies.

1.7.1 Functional Scope
The functional scope of the project is centered on three key modules – Citizens Module, Admin Module, and Field Officials Module – each playing an essential role in ensuring seamless communication and task resolution.

The Citizens Module focuses on empowering citizens by providing them access to an easy-to-use interface where they can register, log in, and adopt trees or report issues by submitting relevant details such as photographs, descriptions, and exact geolocation. Once an activity is registered, users receive instant email notifications confirming submission and subsequent updates about the progress.

The Admin Module serves as the core control unit of the system. Administrators can manage registered users and officials, create and maintain records of zones, divisions, and wards, and assign tasks to appropriate field officials based on their jurisdiction. They can track each task's progress, update its status, and ensure timely resolution.

The Field Officials Module is designed to support the operational side. Through this module, field officials can view the list of tasks assigned to them, visit the reported locations, verify the authenticity of the reports, and take appropriate actions.

1.7.2 Technical and Operational Scope
The technical and operational scope extends across multiple dimensions, combining the power of modern web technologies with practical field operations. From a technical perspective, the system is developed as a PWA to ensure seamless performance across various platforms. The frontend of the application is built using HTML, CSS, JavaScript, and React to provide an interactive, responsive, and visually appealing user interface. The backend is powered by Node.js/Express and integrated with a database which securely stores user data, adoptions, reports, status updates, and administrative records.

1.8 Features
This application is designed as a comprehensive and technology-driven solution that enhances the efficiency of urban forestry management.
- Progressive Web Application (PWA): Ensuring that users can access it directly from any device without the need for installation.
- User Authentication and Secure Access: A secure registration and login mechanism is provided for all users.
- Smart Reporting and Adoption: Users can adopt trees and report issues conveniently by uploading photographs and automatically capturing their current GPS location.
- Real-Time Location Integration: The system uses geolocation services to fetch and record the latitude and longitude of reported trees.
- Automated Email Notifications: The system automatically sends real-time email notifications to users, administrators, and field officials during key stages.
- Interactive and Responsive Dashboard: Provides a real-time overview of system activities, including the number of adoptions and reports.
"""

chap2 = """2. LITERATURE REVIEW

2.1 Introduction
A literature review is a critical summary and analysis of existing research, studies, and publications related to a particular topic. It helps to understand what has already been explored, identify gaps in knowledge, and provide a foundation for designing and justifying our own project. By reviewing previous work, a literature review highlights effective methodologies, challenges faced, and solutions proposed by other researchers. It also demonstrates how our project contributes to the existing body of knowledge and addresses unmet needs.

2.2 Result Analysis
As urban populations expand rapidly, cities are struggling with effective ecological management and illegal deforestation, prompting research into intelligent systems for monitoring and streamlining tree tracking. Several recent studies have explored IoT- and sensor-based architectures for smart forestry management, demonstrating the effectiveness of continuous telemetry and automated operational decision-making. These systems automatically detect illegal logging or optimize planting routes based on real-time data, significantly reducing operational delays and resource wastage.

Similarly, other studies have proposed a scalable IoT-based architecture for sustainable environmental management, integrating cloud-based dashboards with smart sensors to automate monitoring and predictive maintenance. These systems provide continuous surveillance and can proactively prevent tree loss in high-risk areas. Compared to these IoT-heavy approaches, our PWA-based Tree Canopy Management System relies primarily on citizen-initiated reporting and adoption, which is low-cost, scalable, and requires minimal infrastructure. While it does not automatically detect every cut tree, it leverages the city's residents as distributed sensors, ensuring that real-time reporting can occur from any location.

Another area of research focuses on image-based and machine learning approaches for tree detection and classification. Deep learning models capable of detecting and categorizing tree health in urban environments achieve high accuracy using convolutional neural networks. The literature emphasizes that image-based verification, when combined with a human-in-the-loop workflow, provides a practical balance between automation and reliability, a model our PWA could adopt in subsequent phases.

Crowdsourced reporting and citizen engagement form another critical component of effective urban forestry management. Studies highlight the benefits of engaging residents as distributed sensors to detect and report environmental problems in real time. These works emphasize transparency, timely feedback, and clear workflows to ensure trust and sustained participation. Our PWA implements these principles through structured forms, geotagged images, admin-module assignments, field-official verification, and automated email notifications.

2.3 Identified gaps in the Literature
- Most existing environmental management systems are too costly because they depend on IoT sensors, drones, or satellite imagery. These technologies are not affordable or practical for all municipalities.
- There are very few citizen-based systems that allow people to easily adopt trees and report issues using their mobile phones. Most studies focus only on automatic detection and ignore public participation.
- Current systems do not connect citizens and authorities effectively. Many research works focus on data collection but not on the process of verifying, updating, and resolving civic reports.
- Many smart environmental systems work separately without integration. For example, IoT-based detection and citizen reports are not combined to give a full picture of the problem.
- There is a lack of image verification in most reporting systems. Citizens may upload images, but there are no automated tools to check or confirm the reports quickly.
- Predictive analysis and hotspot mapping are rarely used for tree planting. Most systems only report current problems and do not analyze data to find future risk areas.
- There is little focus on data privacy and user trust. Many studies do not explain how users' personal data and location details will be protected.
- Offline accessibility is often missing. Many applications need continuous internet access, which can be a problem in low-connectivity areas.

2.4 Existing System
In the existing scenario, urban forestry management still depends on manual reporting and paper-based processes. Citizens usually inform authorities about illegal felling or request tree adoptions through phone calls, emails, or social media, which often go unnoticed or delayed. There is no proper digital platform to track reports, verify planting, or analyze recurring deforestation zones.

Research studies show that many cities are experimenting with IoT-based systems or sensor technologies to detect environmental issues automatically. However, these systems require high costs and complex setups, making them difficult to implement everywhere. Also, existing systems lack citizen involvement and real-time feedback mechanisms, which are crucial for quick and effective action.

Thus, the current system faces challenges like delayed response, poor coordination, limited automation, and no centralized data for analysis and decision-making.

2.5 Proposed System
The proposed Tree Canopy Management System aims to overcome these limitations by introducing a Progressive Web Application (PWA) that combines citizen participation with smart digital monitoring. Unlike expensive IoT-based models mentioned in studies, this system focuses on low-cost, scalable citizen-driven reporting.

Citizens can easily adopt trees and report issues by uploading photos, GPS locations, and short descriptions. The system automatically sends email alerts, assigns tasks to officials, and allows status tracking through a centralized dashboard. This PWA also creates a structured database that can be later used for machine learning and GIS integration, as suggested in recent literature. By doing so, it bridges the gap between manual systems and advanced automated models.

Overall, the proposed system provides an affordable, transparent, and participatory solution for urban environmental management, aligning with global smart city and sustainable development goals. It enhances efficiency, accountability, and collaboration between citizens, field officials, and administrators.
"""

chap3 = """3. SYSTEM ANALYSIS

3.1 Introduction
Urban deforestation and lack of green cover management have emerged as major civic challenges in metropolitan cities. Despite regular planting drives, numerous trees are lost due to unreported felling, inefficient monitoring, and lack of timely coordination between citizens, field staff, and administrative authorities. The manual process of tracking adoptions and reports often leads to delays, data loss, and poor accountability. Moreover, citizens have limited visibility into the progress or resolution of their reports, resulting in reduced trust in civic systems. Therefore, there is a strong need for a smart, digital, and transparent solution that allows real-time tracking, reporting, and resolution of tree-related issues while enhancing communication between all stakeholders involved.

3.2 Overall Description
The Tree Canopy Management System is a Progressive Web Application (PWA) developed to support municipalities in managing urban forestry more effectively. The system provides a centralized digital platform for citizens, field officials, and administrators to report, verify, and resolve issues related to tree canopies. The application bridges the gap between the public and staff by ensuring real-time reporting, transparency, and accountability. Citizens can capture images, record location details, and submit reports through an intuitive mobile-friendly interface. Field officials can verify the reports, upload action updates, and update status in real-time, while administrators can monitor performance, assign tasks, and analyze city-wide trends.

3.2.1 Product Perspective
The proposed application contains easy graphical interfaces for all types of users. It uses robust databases which eliminate the complications for users. This is a responsive web page, meaning it can adjust to any platform seamlessly. The product provides authenticated access to the data which makes the system highly secure.
It provides:
- Good and easy user interfaces which make the system user-friendly.
- Active workspaces for the users with many functions.

3.2.2 Product Features
- Secure authentication system for Citizens, Field officials, and Admin.
- Allows users to adopt trees and report issues with image uploads, location coordinates, and short descriptions.
- Automatically captures latitude and longitude of the tree sites.
- Centralized control panel to manage reports, adoptions, users, and data.
- Enables field staff to verify reports, upload proof, and close cases.
- Automatic email alerts for registration, status updates, and resolution.
- Hierarchical classification for structured management.

3.2.3 User Characteristics
- General public who want to adopt trees or report issues using a mobile or desktop browser. They possess basic smartphone or internet usage knowledge.
- Field Officials responsible for inspecting, verifying, and resolving reports on the ground.
- Admin who monitors, assigns tasks, and analyzes system reports. They have intermediate to advanced technical skills and data interpretation ability.

3.2.4 General Constraints
- The main constraint here would be checking the genuineness of the user, which is not always possible. There can be security risks involved.
- The developed system should run under any platform (UNIX, Linux, Mac, Windows etc.) that contains a web browser supporting modern web standards.

3.2.5 Assumptions and Dependencies
The system assumes that all users have access to internet-enabled devices equipped with GPS and camera functionality, and that they provide valid contact details for communication and notifications. Its effective operation depends on stable internet connectivity, accurate GPS data, reliable email service integration, and the active participation of both citizens and officials to ensure timely reporting, verification, and resolution of tasks.

3.3 Specific Requirements

3.3.1 External Interface Requirements
All the interactions of the software with different users, hardware, and other software are specified here. The “Tree Canopy Management System” should be simple and easy to understand as well as to use.

3.3.1.1 User Interface
- The system provides a user-friendly GUI to the users.
- Appropriate error messages are generated when a user performs an operation which is invalid.

3.3.1.2 Hardware Interface
- Processor: 133-MHz Intel Pentium-class processor or higher (Client side) / Multi-core Server (Backend)
- RAM: 4GB and above
- Hard Disk: 80GB and above

3.3.1.3 Software Interface
- Front-End: HTML5, CSS3, JavaScript, React.
- Back-End: Node.js, Express, MySQL/MongoDB.

3.3.1.4 Communication Interface
This is a Progressive Web Application and communication is done through the internet and internet protocols (HTTP/HTTPS, REST APIs).

3.4 Functional Requirements

3.4.1 Citizens Module
This module is designed for citizens who adopt trees, raise reports, and track their resolution status. It enables active participation in improving the green cover of their surroundings.
- Registration: Allows new users to create an account by providing basic details such as name, mobile number, address, email, and password. This ensures user authentication and secure access to the system.
- Login: Provides secure access to registered users by verifying their credentials. Once logged in, users can access all features.
- Profile: Displays user information such as name, contact details, address. Citizens can update their profile whenever necessary.
- Adopt/Report: Enables citizens to adopt trees or raise reports by uploading photos, adding a short description, and fetching location details (latitude and longitude). This is submitted to the concerned officials.
- Check Status: Allows users to monitor the progress of their submitted adoptions/reports. The status is updated in real time by field officials or administrators.
- Details: Provides detailed information about each activity, including submission date, status updates, and resolution details.

3.4.2 Admin Module
The admin module serves as the central control panel for managing users, field officials, adoptions, reports, and master data such as zones, divisions, and wards. It ensures smooth coordination among all system stakeholders.
- Login: Provides secure authentication for administrators to access the backend dashboard and management tools.
- Reports Generation: Allows administrators to generate various analytical and performance reports based on trends, ward-wise data, and official activity. These reports help in tracking efficiency and improving green management strategies.
- Management: Enables the admin to view, assign, or reassign tasks to field officials. It also helps in assigning officials to specific wards and monitoring their performance based on task resolution.
- App User Module: Manages all registered users and field officials in the system. It includes options to view user profiles, manage access, and monitor participation.
- Masters Module: Handles the basic setup and structure of the system's geographic data (Zones, Divisions, Wards).

3.4.3 Field Officials Module
This module is designed for field officials responsible for verifying and resolving reported tree issues and confirming adoptions.
- Login: Provides secure login access for field officials to view and manage tasks assigned to them.
- Profile: Displays the official's personal details, contact information, and address. Officials can update their details if necessary.
- View Tasks: Lists all adoptions and reports assigned to the official within their ward.
- Update Status: Allows officials to verify and inspect locations reported by citizens. They can update the status after physical verification, uploading resolved image details and status.
- History: Maintains a record of all previously handled tasks, allowing officials to review their work history and completed tasks for future reference.

3.5 Performance Requirements
- The application requires an internet connection for real-time synchronization.
- Should have a good memory space for caching in PWA mode.
- Should be error-free with fast load times and highly responsive interfaces.
"""

chap4 = """4. DESIGN AND METHODOLOGY

4.1 System Design
System design is a primary phase of software development. System design aims to identify the modules that should be in the system. Design is the first step in the development phase of any system product or system. It may be defined as “the process of applying various techniques and principles for the purpose of defining a device, process or a system in sufficient detail to permit its physical realization”. The specification of these modules and how they interact with each other are the desired results. The goal of the design process is to produce a model or representation of the system which can be used later to build that system. It is the plan for the solution of the system. Design includes requirement specification and final solution for satisfying the requirements.

4.1.1 Functional Decompositions
The Citizens Module is designed to empower citizens to actively participate in maintaining urban green cover by allowing them to adopt trees and track reports. Through this module, citizens can register by providing essential details such as name, mobile number, address, email, and password to ensure secure access and authentication. Once registered, users can log in to their accounts to access various features, including viewing and updating their profiles. The system enables citizens to raise reports by uploading photos, adding descriptions, and automatically capturing location details like latitude and longitude, which are then directed to the concerned officials for resolution.

The Admin Module serves as the central management system, overseeing users, field officials, reports, and geographic data such as zones, divisions, and wards. It provides secure login access for administrators to manage backend operations efficiently. Admins can generate analytical reports to monitor trends, official performance, and ward-wise activities, aiding in data-driven decision-making. The management feature allows viewing, assigning, or reassigning tasks to officials while tracking their progress.

The Field Officials Module supports officials responsible for verifying and resolving tasks. After secure login, officials can access their profiles, view assigned tasks, upload resolved photos, and update statuses. They can also verify citizen-reported issues, maintain a record of resolved cases in the history section, and ensure accountability in task handling, thus promoting efficient and transparent operations.

4.2 Detailed Design
Detailed design is the second level of the design process. During detailed design, we specify how the modules in the system interact with each other and the internal logic of each of the modules specified during system design is decided, hence it is also called as logic design. Detailed design essentially expands the system design and database design to contain a more detailed description of the processing logic and data structures so that the design is sufficiently complete for coding.

4.2.1 Data Flow Diagram (DFD)
Data Flow Diagram shows the flow of data through the system. Data Flow Diagrams are also called Data Flow Graphs. It views a system as a function that transforms the inputs into desired outputs. It aims to capture the transformation that has taken place within a system to the input data so that eventually the output data is produced.
- Context Flow Diagram: Shows input and output of the system. It shows all the external entities that interact with the system and how the data flow between the external entities and the system. (e.g., Citizens -> Tree Canopy System <- Field Officials).
- Citizens Module DFD: Citizen -> Registration (saves to Users table) -> Profile -> Adopt Tree (saves to Adoptions table) -> View Status (reads from Adoptions table).
- Admin Module DFD: Admin -> Login -> Manage Users -> Manage Masters (Zones, Divisions, Wards) -> Assign Tasks.
- Field Officials Module DFD: Official -> Login -> View Assigned Tasks -> Update Status -> Save to History.

4.2.2 Structure Chart
Structure chart is a top-down modular design, consisting of squares representing different models in a system and lines. Structure chart shows how the program has been partitioned into manageable modules hierarchy and the organization of those modules and communicational interface. For the Tree Canopy Management System, the top level is the Application, branching into the three main user roles (Citizen, Admin, Official), which further branch into their specific functionalities like Registration, Task Management, Reporting, and Authentication.

4.2.3 UML Diagram
A UML Class Diagram is a structural diagram that represents the classes of a system, their attributes, methods, and the relationships between them. It helps visualize how different components interact with each other in an object-oriented design. This diagram is widely used for planning, analyzing, and documenting software systems.
Key entities include:
- User (id, name, email, password, phone, role)
- Report/Adoption (id, user_id, latitude, longitude, image, description, status)
- Official (id, name, email, password, zone)
- Admin (id, name, email, password)
- Zone/Ward (id, name, boundaries)

4.3 Database Design
Database design is the process of producing a detailed data model of a database. The data model contains all the needed logical and physical design choices and physical storage parameters needed to generate a design in a data definition language which can then be used to create a database. A fully attributed data model contains detailed attributes for each entity.

4.3.1 Table Descriptions
- Users Table: id (Primary Key), name, phone, email, address, password.
- Admin Table: id (Primary Key), email, password.
- Reports/Adoptions Table: id (Primary Key), latitude, longitude, image, remarks, user_id (Foreign Key), status, ward, updated_image, official_remarks.
- Officials Table: id (Primary Key), name, phone, email, password, zone, division, ward.
- Zones/Divisions/Wards Tables: To manage the hierarchical geographical data accurately, ensuring proper mapping of tasks to officials based on their assigned areas.
"""

chap5 = """5. IMPLEMENTATION DETAILS

5.1 Introduction
The goal of the coding or implementation phase is to translate the system design, produced during the designing phase, into code in a given programming language which can be executed by a computer and that performs the computation specified by the design. During the implementation, it should be kept in mind that the programs should not be constructed so that they are easy to write, but that they are easy to read and understand.

5.2 Hardware and software tools used
A set of reliable hardware and software tools is used for developing and operating the Tree Canopy Management System. These tools ensure smooth reporting, tracking, and management of data with real-time accuracy. The selected technologies provide scalability, security, and easy maintenance for efficient system performance.

5.2.1 Software Requirements
5.2.1.1 Frontend Technologies
- HTML5 and CSS3: Used to create the structure of the web pages, while CSS3 adds style, color, and layout to make the design attractive and responsive. Together, they help build a clean and user-friendly interface that works well on all devices.
- JavaScript & React: Makes the web pages interactive and dynamic. Helps in real-time validation, state management, component-based architecture, and smooth communication between the frontend and backend without reloading the page.
- Tailwind CSS / Bootstrap: Used to design responsive and mobile-friendly web pages. It provides ready-made components, ensuring a consistent and neat layout across all screen sizes.

5.2.1.2 Backend Technologies
- Node.js & Express: Used as the main backend framework for developing the application. It helps manage routes, handle authentication, process REST API requests, and connect with the database efficiently. Its non-blocking architecture ensures better performance and scalability of the project.
- MongoDB / MySQL: Serves as the database for storing user details, reports, locations, and admin records. It provides fast, secure, and reliable data management for the system.

5.2.1.3 Development Tools
- Visual Studio Code: A lightweight, open-source code editor that supports numerous programming languages and extensions. It provides features like intelligent code completion, debugging, Git integration, and a customizable interface, making it ideal for web development.
- Postman: Used for testing REST API endpoints during backend development.

5.2.2 Hardware Requirements
- Processor: Intel core processor with 64-Bit support, Recommended: 2.8GHz or faster processor.
- RAM: Minimum 4 GB (8 GB recommended).
- Hard Disk: 10 GB free space.

5.3 Source Code
The project follows a standard MVC (Model-View-Controller) pattern for the backend and a component-based architecture for the frontend. (Detailed code snippets for models like Tree.js, Complaint.js, and routes like trees.js are part of the actual codebase maintained in the project repository).
"""

chap6 = """6. RESULT AND EVALUATION

6.1 Introduction
Result and Evaluation is an investigation conducted to provide stakeholders with information about the quality of the product or service under test. It has been defined as the process of analyzing a software item to detect the differences between existing and required conditions and to evaluate the features of the software item.

It involves the operation of a system or application under controlled conditions and evaluating the results. The controlled conditions should include both normal and abnormal conditions. The objective of this is to intentionally introduce faults into the system to verify whether the functions perform correctly under specific conditions. It is essentially a detection-oriented process.

6.2 Test Scenario
A test scenario is a high-level description of a functionality or feature that needs to be tested within a software application. It represents a real-world situation that a user might encounter while using the system. The purpose of creating test scenarios is to ensure that every aspect of the application is covered during testing and that the system behaves as expected under different conditions. Test scenarios help testers understand what to test without focusing on the exact steps, providing a broad view of the system's behavior and business flow.

For the Tree Canopy Management System, scenarios include citizen registration, adopting a tree, raising an issue with location data, admin assigning a task, and an official updating the status.

6.3 Test Cases
A test case is a software testing document, which consists of event, action, input, output, expected result, and actual result. Clinically defined, a test case is an input and an expected result. This can be pragmatic as ‘for condition x your derived result is y’, whereas other test cases describe in more detail the input scenario and what results might be expected. It can occasionally be a series of steps but one with expected results or expected outcome. A test case should also contain a place for the actual result. White box and black box testing are applicable at the unit, integration, and system levels of the software testing process.

Sample Test Cases:
- Registration Form: Test empty fields, invalid email format, mismatched passwords, successful registration. Expected: Validation errors for incorrect data; successful redirect to login upon valid data.
- Login Form: Test incorrect credentials, correct credentials, unverified accounts. Expected: Dashboard access granted only for valid, verified accounts.
- Adopt Tree / Raise Report: Test without GPS location, without mandatory image, with valid data. Expected: System prompts to allow location access; accepts valid submissions and generates an ID.
- Admin Dashboard: Test generating reports for a specific date range, assigning an official to a task. Expected: Accurate data representation in reports; official receives task in their queue.
- Official Updating Status: Test uploading a resolution image and marking task as complete. Expected: Task status updates globally, and citizen is notified.
"""

chap7 = """7. CONCLUSION AND FUTURE WORK

7.1 Conclusion
The Tree Canopy Management System is an innovative progressive web application designed to address one of the major challenges faced by urban areas – the loss of green cover and improper management of urban forestry. The system provides a digital platform that bridges the gap between citizens and municipal authorities, enabling efficient reporting, monitoring, and management of tree-related data. Through features such as image-based reporting, real-time tracking, automated notifications, and data visualization, the system ensures transparency, accountability, and timely resolution of issues.

This project encourages active citizen participation by allowing users to easily adopt trees and report issues through an interactive interface. The system automatically captures the location of the report, helping municipal authorities identify and act on problem areas promptly. Administrators can monitor the overall green cover, track field official performance, and generate analytical reports that help in making strategic decisions. By using robust modern web technologies, the system ensures a secure, scalable, and user-friendly experience for all users.

Moreover, the Tree Canopy Management System contributes significantly to promoting environmental preservation and sustainable urban management. It supports the concept of a smart city by integrating technology into everyday governance, ensuring greener surroundings and a healthier living environment for citizens. By digitalizing the forestry management process, it reduces manual effort, saves time, and minimizes delays in issue resolution. Overall, the system plays a crucial role in fostering public awareness, civic responsibility, and effective environmental practices, thereby moving one step closer to a cleaner, greener, and sustainable city.

7.2 Future Work
The Tree Canopy Management System has significant potential for future enhancements that can further strengthen its effectiveness, citizen engagement, and administrative efficiency. One of the major improvements that can be introduced is a Reward and Gamification Module. This module can motivate citizens to actively participate in maintaining green cover by offering digital badges, appreciation certificates, and leaderboard rankings based on their planting frequency and contribution to the environment.

Another important enhancement is the integration of advanced technologies like AI and IoT. Future iterations could use AI-based image recognition to automatically detect tree diseases from user-uploaded photos, providing immediate preliminary diagnoses. Furthermore, integrating IoT sensors with adopted trees could allow real-time monitoring of soil moisture, temperature, and overall tree health, sending automated alerts to citizens and officials when immediate care is required.

Additionally, incorporating a comprehensive GIS-based hotspot mapping feature will allow authorities to visually monitor areas with frequent tree loss or low green density by plotting coordinates on an interactive map. Over time, the system can highlight deforestation zones, identify patterns, and predict potential problem areas to assist in strategic planning and resource allocation. By implementing these advanced features, the Tree Canopy Management System can evolve into a highly intelligent and proactive platform for urban environmental sustainability.
"""

files = {
    "1_Introduction.txt": chap1,
    "2_Literature_Review.txt": chap2,
    "3_System_Analysis.txt": chap3,
    "4_Design_And_Methodology.txt": chap4,
    "5_Implementation_Details.txt": chap5,
    "6_Result_and_Evaluation.txt": chap6,
    "7_Conclusion_and_Future_Work.txt": chap7
}

for fname, content in files.items():
    with open(os.path.join(docs_dir, fname), "w", encoding="utf-8") as f:
        f.write(content.strip())

print("All detailed chapter files generated successfully.")
