import React, { useState } from "react";
import { FaUserPlus, FaSearch, FaHandshake, FaCalendarAlt, FaShareAlt } from "react-icons/fa";
import { IoMdArrowDropdown } from "react-icons/io";
import { motion } from "framer-motion";

const About = () => {
  const [activeFaq, setActiveFaq] = useState(null);

  const features = [
    { icon: <FaHandshake className="text-4xl text-blue-500" />, title: "Peer-to-Peer Exchange", description: "Connect directly with skilled individuals ready to share their knowledge" },
    { icon: <FaUserPlus className="text-4xl text-blue-500" />, title: "One-on-One Interaction", description: "Personalized learning experience tailored to your needs" },
    { icon: <FaShareAlt className="text-4xl text-blue-500" />, title: "Diverse Skills", description: "Wide range of skills from technical to creative arts" },
    { icon: <FaCalendarAlt className="text-4xl text-blue-500" />, title: "Flexible Schedule", description: "Learn at your own pace with convenient scheduling" }
  ];

  const steps = [
    { number: 1, title: "Create Account", description: "Sign up and complete your profile" },
    { number: 2, title: "Browse Skills", description: "Explore various skills and mentors" },
    { number: 3, title: "Connect", description: "Find your perfect learning match" },
    { number: 4, title: "Schedule", description: "Book your learning sessions" },
    { number: 5, title: "Learn & Share", description: "Start your learning journey" }
  ];

  const faqs = [
    { question: "How do I start sharing skills?", answer: "Simply create an account, list your skills, and start connecting with learners." },
    { question: "Is the platform free?", answer: "Basic membership is free. Premium features are available for a small monthly fee." },
    { question: "How are sessions scheduled?", answer: "Use our integrated calendar system to book sessions that work for both parties." },
    { question: "What skills can I learn/share?", answer: "Any skill! From programming to cooking, music to mathematics." }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <section className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold mb-6 text-gray-800"
          >
            Welcome to Hands United
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-gray-600 leading-relaxed"
          >
            Hands United is a dynamic platform that connects passionate learners with skilled mentors. We believe in the power of shared knowledge and collaborative learning. Our platform enables individuals to exchange skills, learn from experts, and grow together in a supportive community environment.
          </motion.p>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">Why Choose Hands United?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-6 bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300"
              >
                <div className="mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-blue-50 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative"
              >
                <div className="bg-white p-6 rounded-lg shadow-lg text-center">
                  <div className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center mx-auto mb-4">
                    {step.number}
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                  <p className="text-gray-600">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="text-center md:text-left">
              <h2 className="text-3xl font-bold mb-6">Our Mission</h2>
              <p className="text-lg mb-6">
                To create a world where knowledge knows no boundaries, where every individual has the opportunity to learn,
                grow, and share their unique skills with others. We strive to build a global community of lifelong learners
                and passionate teachers.
              </p>
              <div className="space-y-4">
                <div className="p-4 bg-white bg-opacity-10 rounded-lg">
                  <h3 className="text-xl font-semibold mb-2">Connect</h3>
                  <p>Bringing together passionate learners and skilled mentors</p>
                </div>
                <div className="p-4 bg-white bg-opacity-10 rounded-lg">
                  <h3 className="text-xl font-semibold mb-2">Empower</h3>
                  <p>Enabling everyone to achieve their learning goals</p>
                </div>
              </div>
            </div>
            <div className="text-center md:text-left">
              <h2 className="text-3xl font-bold mb-6">Our Vision</h2>
              <p className="text-lg mb-6">
                To become the world's leading platform for skill exchange and personal development, where geographical
                boundaries and social barriers cease to exist in the pursuit of knowledge.
              </p>
              <div className="space-y-4">
                <div className="p-4 bg-white bg-opacity-10 rounded-lg">
                  <h3 className="text-xl font-semibold mb-2">Innovation</h3>
                  <p>Pioneering new ways of collaborative learning</p>
                </div>
                <div className="p-4 bg-white bg-opacity-10 rounded-lg">
                  <h3 className="text-xl font-semibold mb-2">Impact</h3>
                  <p>Creating lasting positive change through education</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-white rounded-lg shadow-md">
                <button
                  className="w-full px-6 py-4 text-left flex justify-between items-center focus:outline-none"
                  onClick={() => setActiveFaq(activeFaq === index ? null : index)}
                >
                  <span className="font-semibold">{faq.question}</span>
                  <IoMdArrowDropdown
                    className={`transform transition-transform duration-200 ${
                      activeFaq === index ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {activeFaq === index && (
                  <div className="px-6 py-4 border-t">
                    <p className="text-gray-600">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;