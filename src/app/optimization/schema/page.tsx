"use client";

import React, { useState } from "react";
import { 
  Code2, 
  Copy, 
  CheckCircle, 
  FileText,
  HelpCircle,
  ListOrdered,
  Plus,
  Trash2,
  Eye,
  Download
} from "lucide-react";

type SchemaType = "article" | "faq" | "howto" | "breadcrumb";

interface FAQItem {
  question: string;
  answer: string;
}

interface HowToStep {
  name: string;
  text: string;
  image?: string;
}

export default function SchemaMarkupPage() {
  const [schemaType, setSchemaType] = useState<SchemaType>("article");
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  // Article Schema State
  const [articleData, setArticleData] = useState({
    headline: "",
    description: "",
    author: "",
    datePublished: new Date().toISOString().split("T")[0],
    dateModified: new Date().toISOString().split("T")[0],
    image: "",
    publisher: "",
  });

  // FAQ Schema State
  const [faqItems, setFaqItems] = useState<FAQItem[]>([
    { question: "", answer: "" },
  ]);

  // HowTo Schema State
  const [howToData, setHowToData] = useState({
    name: "",
    description: "",
    totalTime: "PT30M",
  });
  const [howToSteps, setHowToSteps] = useState<HowToStep[]>([
    { name: "", text: "" },
  ]);

  // Breadcrumb State
  const [breadcrumbs, setBreadcrumbs] = useState([
    { name: "Home", url: "/" },
    { name: "", url: "" },
  ]);

  const generateSchema = (): object => {
    switch (schemaType) {
      case "article":
        return {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: articleData.headline || "Article Title",
          description: articleData.description || "Article description",
          author: {
            "@type": "Person",
            name: articleData.author || "Author Name",
          },
          datePublished: articleData.datePublished,
          dateModified: articleData.dateModified,
          image: articleData.image || undefined,
          publisher: {
            "@type": "Organization",
            name: articleData.publisher || "Publisher Name",
            logo: {
              "@type": "ImageObject",
              url: "https://example.com/logo.png",
            },
          },
          mainEntityOfPage: {
            "@type": "WebPage",
            "@id": "https://example.com/article",
          },
        };

      case "faq":
        return {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqItems
            .filter((item) => item.question && item.answer)
            .map((item) => ({
              "@type": "Question",
              name: item.question,
              acceptedAnswer: {
                "@type": "Answer",
                text: item.answer,
              },
            })),
        };

      case "howto":
        return {
          "@context": "https://schema.org",
          "@type": "HowTo",
          name: howToData.name || "How to Guide",
          description: howToData.description || "Step by step guide",
          totalTime: howToData.totalTime,
          step: howToSteps
            .filter((step) => step.name && step.text)
            .map((step, index) => ({
              "@type": "HowToStep",
              position: index + 1,
              name: step.name,
              text: step.text,
              image: step.image || undefined,
            })),
        };

      case "breadcrumb":
        return {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: breadcrumbs
            .filter((item) => item.name && item.url)
            .map((item, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: item.name,
              item: item.url,
            })),
        };

      default:
        return {};
    }
  };

  const getSchemaScript = () => {
    const schema = generateSchema();
    return `<script type="application/ld+json">
${JSON.stringify(schema, null, 2)}
</script>`;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(getSchemaScript());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadSchema = () => {
    const blob = new Blob([getSchemaScript()], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${schemaType}-schema.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const addFaqItem = () => {
    setFaqItems([...faqItems, { question: "", answer: "" }]);
  };

  const removeFaqItem = (index: number) => {
    setFaqItems(faqItems.filter((_, i) => i !== index));
  };

  const addHowToStep = () => {
    setHowToSteps([...howToSteps, { name: "", text: "" }]);
  };

  const removeHowToStep = (index: number) => {
    setHowToSteps(howToSteps.filter((_, i) => i !== index));
  };

  const addBreadcrumb = () => {
    setBreadcrumbs([...breadcrumbs, { name: "", url: "" }]);
  };

  const removeBreadcrumb = (index: number) => {
    setBreadcrumbs(breadcrumbs.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Code2 className="w-7 h-7 text-orange-600" />
            Schema Markup Generator
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Generate structured data for better search engine visibility
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            <Eye className="w-4 h-4" />
            {showPreview ? "Hide" : "Show"} Preview
          </button>
        </div>
      </div>

      {/* Schema Type Selector */}
      <div className="flex flex-wrap gap-2">
        {[
          { type: "article" as SchemaType, label: "Article", icon: FileText },
          { type: "faq" as SchemaType, label: "FAQ", icon: HelpCircle },
          { type: "howto" as SchemaType, label: "HowTo", icon: ListOrdered },
          { type: "breadcrumb" as SchemaType, label: "Breadcrumb", icon: Code2 },
        ].map(({ type, label, icon: Icon }) => (
          <button
            key={type}
            onClick={() => setSchemaType(type)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              schemaType === type
                ? "bg-orange-600 text-white"
                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form Panel */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {schemaType.charAt(0).toUpperCase() + schemaType.slice(1)} Schema
            </h2>
          </div>
          
          <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
            {/* Article Schema Form */}
            {schemaType === "article" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Headline *
                  </label>
                  <input
                    type="text"
                    value={articleData.headline}
                    onChange={(e) => setArticleData({ ...articleData, headline: e.target.value })}
                    placeholder="Enter article headline"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={articleData.description}
                    onChange={(e) => setArticleData({ ...articleData, description: e.target.value })}
                    placeholder="Brief description of the article"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Author
                    </label>
                    <input
                      type="text"
                      value={articleData.author}
                      onChange={(e) => setArticleData({ ...articleData, author: e.target.value })}
                      placeholder="Author name"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Publisher
                    </label>
                    <input
                      type="text"
                      value={articleData.publisher}
                      onChange={(e) => setArticleData({ ...articleData, publisher: e.target.value })}
                      placeholder="Publisher name"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Date Published
                    </label>
                    <input
                      type="date"
                      value={articleData.datePublished}
                      onChange={(e) => setArticleData({ ...articleData, datePublished: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Date Modified
                    </label>
                    <input
                      type="date"
                      value={articleData.dateModified}
                      onChange={(e) => setArticleData({ ...articleData, dateModified: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Image URL
                  </label>
                  <input
                    type="url"
                    value={articleData.image}
                    onChange={(e) => setArticleData({ ...articleData, image: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </>
            )}

            {/* FAQ Schema Form */}
            {schemaType === "faq" && (
              <>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Add question and answer pairs to generate FAQ schema markup.
                </p>
                {faqItems.map((item, index) => (
                  <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Q&A {index + 1}
                      </span>
                      {faqItems.length > 1 && (
                        <button
                          onClick={() => removeFaqItem(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={item.question}
                      onChange={(e) => {
                        const newItems = [...faqItems];
                        newItems[index].question = e.target.value;
                        setFaqItems(newItems);
                      }}
                      placeholder="Question"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                    <textarea
                      value={item.answer}
                      onChange={(e) => {
                        const newItems = [...faqItems];
                        newItems[index].answer = e.target.value;
                        setFaqItems(newItems);
                      }}
                      placeholder="Answer"
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                ))}
                <button
                  onClick={addFaqItem}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-orange-600 hover:text-orange-700"
                >
                  <Plus className="w-4 h-4" />
                  Add Question
                </button>
              </>
            )}

            {/* HowTo Schema Form */}
            {schemaType === "howto" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Guide Name *
                  </label>
                  <input
                    type="text"
                    value={howToData.name}
                    onChange={(e) => setHowToData({ ...howToData, name: e.target.value })}
                    placeholder="How to do something"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={howToData.description}
                    onChange={(e) => setHowToData({ ...howToData, description: e.target.value })}
                    placeholder="Brief description of the guide"
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Total Time (ISO 8601)
                  </label>
                  <input
                    type="text"
                    value={howToData.totalTime}
                    onChange={(e) => setHowToData({ ...howToData, totalTime: e.target.value })}
                    placeholder="PT30M (30 minutes)"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Steps</p>
                {howToSteps.map((step, index) => (
                  <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Step {index + 1}
                      </span>
                      {howToSteps.length > 1 && (
                        <button
                          onClick={() => removeHowToStep(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={step.name}
                      onChange={(e) => {
                        const newSteps = [...howToSteps];
                        newSteps[index].name = e.target.value;
                        setHowToSteps(newSteps);
                      }}
                      placeholder="Step name"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                    <textarea
                      value={step.text}
                      onChange={(e) => {
                        const newSteps = [...howToSteps];
                        newSteps[index].text = e.target.value;
                        setHowToSteps(newSteps);
                      }}
                      placeholder="Step instructions"
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                ))}
                <button
                  onClick={addHowToStep}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-orange-600 hover:text-orange-700"
                >
                  <Plus className="w-4 h-4" />
                  Add Step
                </button>
              </>
            )}

            {/* Breadcrumb Schema Form */}
            {schemaType === "breadcrumb" && (
              <>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Define your breadcrumb navigation path.
                </p>
                {breadcrumbs.map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-500 w-6">{index + 1}.</span>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => {
                        const newItems = [...breadcrumbs];
                        newItems[index].name = e.target.value;
                        setBreadcrumbs(newItems);
                      }}
                      placeholder="Name"
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <input
                      type="text"
                      value={item.url}
                      onChange={(e) => {
                        const newItems = [...breadcrumbs];
                        newItems[index].url = e.target.value;
                        setBreadcrumbs(newItems);
                      }}
                      placeholder="/path"
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    {breadcrumbs.length > 1 && (
                      <button
                        onClick={() => removeBreadcrumb(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={addBreadcrumb}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-orange-600 hover:text-orange-700"
                >
                  <Plus className="w-4 h-4" />
                  Add Level
                </button>
              </>
            )}
          </div>
        </div>

        {/* Output Panel */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Generated Schema
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={downloadSchema}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
              <button
                onClick={copyToClipboard}
                className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors ${
                  copied
                    ? "bg-green-600 text-white"
                    : "bg-orange-600 text-white hover:bg-orange-700"
                }`}
              >
                {copied ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy Code
                  </>
                )}
              </button>
            </div>
          </div>
          
          <div className="p-4">
            <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm max-h-[550px] overflow-y-auto">
              <code>{getSchemaScript()}</code>
            </pre>
          </div>
        </div>
      </div>

      {/* Schema Benefits */}
      <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-xl p-6 text-white">
        <h3 className="text-lg font-semibold mb-4">Why Use Schema Markup?</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h4 className="font-medium mb-2">Rich Snippets</h4>
            <p className="text-sm text-orange-100">
              Stand out in search results with enhanced listings featuring ratings, FAQs, and more.
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-2">Better CTR</h4>
            <p className="text-sm text-orange-100">
              Rich results typically see 20-30% higher click-through rates than standard listings.
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-2">Voice Search</h4>
            <p className="text-sm text-orange-100">
              Structured data helps voice assistants better understand and present your content.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
